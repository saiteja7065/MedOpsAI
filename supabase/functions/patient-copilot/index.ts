import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";
const MAX_TOOL_ROUNDS = 4;

// Same "rules decide, AI narrates" split as admin-copilot/doctor-copilot for
// the records side: every tool is a deterministic Supabase query scoped to
// the calling patient's own patient_id (resolved server-side from the
// caller's JWT). This copilot also gives general, non-diagnostic symptom
// guidance directly from the model's own knowledge — no tool needed for
// that — but true emergencies are caught client-side by a deterministic
// keyword check BEFORE this function is ever called, so this prompt never
// has to be the safety net for something that critical.
const SYSTEM_PROMPT = `You are the AI Copilot for a patient inside MedOps AI, a hospital administration system. You have two jobs:

1. Look up this patient's own real records — appointments, prescriptions, medical reports, and which doctors they've seen — never another patient's data. Always call a tool for this; never invent, estimate, or round a number that didn't come from a tool result.
2. Give brief, general, non-diagnostic guidance for everyday symptoms (fever, headache, common cold, minor aches) using your own medical knowledge — no tool needed for this. Always add that this isn't a diagnosis and recommend booking an appointment if symptoms are severe, unusual, or persistent. (True emergencies are already intercepted before reaching you, so you don't need to handle those.)

Rules:
- Only state record facts that came back from a tool call in this conversation — never guess at appointment dates, medicines, or report contents.
- Stay strictly on this patient's own hospital records and general symptom guidance. If asked something unrelated (general knowledge outside health, other patients' data, other software, small talk beyond a greeting), briefly decline and steer back to what you can help with here.
- Be concise: this is a chat widget, not a report. Prefer 2-5 sentences or a short bullet list over long prose.
- If a tool returns zero or empty results, say so plainly instead of filling in a plausible-sounding answer.
- Call at most one or two tools per question. As soon as a tool gives you enough to answer, answer — don't keep calling tools looking for a better answer.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_my_appointments_overview",
      description: "Real counts and list of this patient's own appointments — upcoming and past, by status — plus their next scheduled appointment. Use for any question about this patient's bookings or visit history.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_prescriptions",
      description: "This patient's own real prescriptions — diagnosis, medicines, instructions, and follow-up date for each. Use for questions about what medicines were prescribed or by whom.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_medical_reports",
      description: "This patient's own real medical reports — type, title, AI summary, and any flagged conditions. Use for questions about lab results, uploaded reports, or diagnoses on file.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_doctors",
      description: "The real list of doctors this patient has had appointments with, and how many visits each. Use for questions about which doctors this patient has seen.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY is not configured on this project" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, history } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const { data: { user: caller } } = await supabase.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Could not resolve the calling user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id")
      .eq("profile_id", caller.id)
      .maybeSingle();
    if (patientError) throw patientError;
    if (!patient) {
      return new Response(JSON.stringify({ error: "No patient profile found for this account" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const patientId = patient.id;

    async function runTool(name: string): Promise<unknown> {
      switch (name) {
        case "get_my_appointments_overview": {
          const { data, error } = await supabase
            .from("appointments")
            .select("status, type, appointment_date, appointment_time, reason, doctor:doctors(specialization, profile:profiles!doctors_profile_id_fkey(full_name))")
            .eq("patient_id", patientId)
            .not("appointment_number", "like", "APT-HIST-%")
            .order("appointment_date", { ascending: true });
          if (error) throw error;
          const rows = (data || []) as any[];
          const today = new Date().toISOString().split("T")[0];
          const upcoming = rows.filter((a) => ["pending", "confirmed"].includes(a.status) && a.appointment_date >= today);
          const past = rows.filter((a) => a.status === "completed");
          const next = upcoming[0];
          return {
            totalAppointments: rows.length,
            upcomingCount: upcoming.length,
            completedCount: past.length,
            cancelledCount: rows.filter((a) => a.status === "cancelled").length,
            nextAppointment: next ? {
              date: next.appointment_date,
              time: next.appointment_time,
              doctor: next.doctor?.profile?.full_name,
              specialization: next.doctor?.specialization,
              reason: next.reason,
              type: next.type,
            } : null,
          };
        }

        case "get_my_prescriptions": {
          const { data, error } = await supabase
            .from("prescriptions")
            .select("diagnosis, medicines, instructions, follow_up_date, created_at, doctor:doctors(profile:profiles!doctors_profile_id_fkey(full_name))")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });
          if (error) throw error;
          const rows = (data || []) as any[];
          return {
            count: rows.length,
            prescriptions: rows.map((p) => ({
              diagnosis: p.diagnosis,
              doctor: p.doctor?.profile?.full_name,
              medicines: p.medicines,
              instructions: p.instructions,
              followUpDate: p.follow_up_date,
              date: p.created_at,
            })),
          };
        }

        case "get_my_medical_reports": {
          const { data, error } = await supabase
            .from("medical_reports")
            .select("report_type, title, ai_summary, ai_diseases, is_processed, created_at")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });
          if (error) throw error;
          const rows = (data || []) as any[];
          return {
            count: rows.length,
            reports: rows.map((r) => ({
              type: r.report_type,
              title: r.title,
              summary: r.ai_summary,
              flaggedConditions: r.ai_diseases || [],
              processed: r.is_processed,
              date: r.created_at,
            })),
          };
        }

        case "get_my_doctors": {
          const { data, error } = await supabase
            .from("appointments")
            .select("doctor:doctors(specialization, profile:profiles!doctors_profile_id_fkey(full_name))")
            .eq("patient_id", patientId)
            .not("appointment_number", "like", "APT-HIST-%");
          if (error) throw error;
          const rows = (data || []) as any[];
          const counts = new Map<string, { name: string; specialization: string; visits: number }>();
          for (const r of rows) {
            const name = r.doctor?.profile?.full_name;
            if (!name) continue;
            const entry = counts.get(name) || { name, specialization: r.doctor?.specialization, visits: 0 };
            entry.visits += 1;
            counts.set(name, entry);
          }
          return { doctors: Array.from(counts.values()) };
        }

        default:
          throw new Error(`Unknown tool "${name}". Valid tools are: ${TOOLS.map((t) => t.function.name).join(", ")}.`);
      }
    }

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...((Array.isArray(history) ? history : []).slice(-8).map((m: any) => ({ role: m.role, content: m.content }))),
      { role: "user", content: message },
    ];

    let finalText = "";
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.2,
          messages,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        throw new Error(`Groq API error (${groqRes.status}): ${errText}`);
      }

      const groqData = await groqRes.json();
      const choiceMsg = groqData.choices?.[0]?.message;
      if (!choiceMsg) throw new Error("Groq returned no message");

      messages.push(choiceMsg);

      const toolCalls = choiceMsg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        finalText = (choiceMsg.content || "").trim();
        break;
      }

      for (const tc of toolCalls) {
        let result: unknown;
        try {
          result = await runTool(tc.function.name);
        } catch (toolErr) {
          result = { error: (toolErr as Error).message };
        }
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    if (!finalText) {
      finalText = "I wasn't able to finish looking that up. Could you try rephrasing the question?";
    }

    return new Response(JSON.stringify({ response: finalText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
