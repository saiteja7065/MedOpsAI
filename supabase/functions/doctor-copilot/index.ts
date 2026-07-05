import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";
const MAX_TOOL_ROUNDS = 4;

// Same "rules decide, AI narrates" split as admin-copilot: every tool below
// is a deterministic Supabase query scoped to the calling doctor's own
// doctor_id (resolved server-side from the caller's JWT, not trusted from
// the client). The model can only choose which tool to call and phrase the
// result — it never sees or invents a number on its own.
const SYSTEM_PROMPT = `You are the AI Copilot for a doctor inside MedOps AI, a hospital administration system. You help this doctor understand their own schedule, patients, and claims — never another doctor's data.

Rules:
- Always call a tool to fetch real data before answering any question about the doctor's appointments, patients, schedule, or claims. Never invent, estimate, or round a number that didn't come from a tool result.
- Only state figures that came back from a tool call in this conversation.
- Stay strictly on this doctor's own hospital work. If asked something unrelated (general knowledge, other doctors' data, other software, small talk beyond a greeting), briefly decline and steer back to what you can help with here.
- Be concise: this is a chat widget, not a report. Prefer 2-5 sentences or a short bullet list over long prose.
- If a tool returns zero or empty results, say so plainly instead of filling in a plausible-sounding number.
- Call at most one or two tools per question. As soon as a tool gives you enough to answer, answer — don't keep calling tools looking for a better answer.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_my_appointment_overview",
      description: "Real counts of this doctor's own appointments (today and all-time) broken down by status, plus video-consultation count. Use for any question about this doctor's appointments, queue, or bookings.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_patients_summary",
      description: "Real count of unique patients under this doctor's care and a breakdown of their chronic conditions. Use for questions about this doctor's patient panel or case mix.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_schedule",
      description: "This doctor's real upcoming shifts for the next 7 days. Use for questions about this doctor's schedule, shifts, or availability.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_claims_summary",
      description: "Real insurance claims tied to this doctor, broken down by status, with total billed amount. Use for questions about this doctor's claims, billing, or denial risk.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_patient_detail",
      description: "Real detailed record(s) for this doctor's own patient(s) — name, contact, blood group, allergies, chronic conditions, visit count, and last visit date. If patientName is omitted, returns every patient under this doctor's care. Use this whenever asked for a specific patient's report, history, or details — not just the aggregate patient count.",
      parameters: {
        type: "object",
        properties: {
          patientName: { type: "string", description: "Optional patient name (or partial name) to search for. Omit to list all of this doctor's patients." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_patient_reports",
      description: "Real medical reports (lab results, radiology, prescriptions, etc.) for this doctor's own patients, with AI summaries and flagged conditions where available. If patientName is omitted, returns reports for all of this doctor's patients. Use this for any question about a patient's medical reports, test results, or records.",
      parameters: {
        type: "object",
        properties: {
          patientName: { type: "string", description: "Optional patient name (or partial name) to filter to. Omit to list reports for all of this doctor's patients." },
        },
        required: [],
      },
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

    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id, profile:profiles!doctors_profile_id_fkey(full_name)")
      .eq("profile_id", caller.id)
      .maybeSingle();
    if (doctorError) throw doctorError;
    if (!doctor) {
      return new Response(JSON.stringify({ error: "No doctor profile found for this account" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const doctorId = doctor.id;

    async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
      switch (name) {
        case "get_my_appointment_overview": {
          const { data, error } = await supabase
            .from("appointments")
            .select("status, type, appointment_date")
            .eq("doctor_id", doctorId)
            .not("appointment_number", "like", "APT-HIST-%");
          if (error) throw error;
          const rows = data || [];
          const today = new Date().toISOString().split("T")[0];
          const summarize = (list: typeof rows) => ({
            total: list.length,
            pending: list.filter((a) => a.status === "pending").length,
            confirmed: list.filter((a) => a.status === "confirmed").length,
            completed: list.filter((a) => a.status === "completed").length,
            cancelled: list.filter((a) => a.status === "cancelled").length,
          });
          return {
            today: summarize(rows.filter((a) => a.appointment_date === today)),
            allTime: summarize(rows),
            videoConsultations: rows.filter((a) => a.type === "video").length,
          };
        }

        case "get_my_patients_summary": {
          const { data, error } = await supabase
            .from("appointments")
            .select("patient:patients(id, chronic_conditions)")
            .eq("doctor_id", doctorId)
            .not("appointment_number", "like", "APT-HIST-%");
          if (error) throw error;
          const rows = (data || []) as any[];
          const seen = new Map<string, string[]>();
          for (const r of rows) {
            if (r.patient?.id) seen.set(r.patient.id, r.patient.chronic_conditions || []);
          }
          const conditionCounts = new Map<string, number>();
          for (const conditions of seen.values()) {
            for (const c of conditions) conditionCounts.set(c, (conditionCounts.get(c) || 0) + 1);
          }
          return {
            uniquePatients: seen.size,
            topConditions: Array.from(conditionCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([condition, count]) => ({ condition, count })),
          };
        }

        case "get_my_schedule": {
          const today = new Date().toISOString().split("T")[0];
          const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          const { data, error } = await supabase
            .from("staff_shifts")
            .select("shift_date, shift_type, status")
            .eq("doctor_id", doctorId)
            .gte("shift_date", today)
            .lte("shift_date", weekAhead)
            .order("shift_date", { ascending: true });
          if (error) throw error;
          return { upcomingShifts: data || [] };
        }

        case "get_my_claims_summary": {
          const { data, error } = await supabase
            .from("claims")
            .select("status, billed_amount, denial_risk_score")
            .eq("doctor_id", doctorId);
          if (error) throw error;
          const rows = (data || []) as any[];
          const byStatus: Record<string, number> = {};
          for (const c of rows) byStatus[c.status] = (byStatus[c.status] || 0) + 1;
          return {
            totalClaims: rows.length,
            byStatus,
            totalBilled: rows.reduce((s, c) => s + Number(c.billed_amount || 0), 0),
            highDenialRiskCount: rows.filter((c) => Number(c.denial_risk_score || 0) >= 50).length,
          };
        }

        case "get_my_patient_detail": {
          interface PatientDetailRow {
            id: string;
            patient_id: string;
            blood_group: string | null;
            chronic_conditions: string[] | null;
            allergies: string[] | null;
            profile: { full_name: string | null; phone: string | null; email: string | null } | null;
          }
          const patientName = typeof args.patientName === "string" ? args.patientName.toLowerCase() : undefined;
          const { data, error } = await supabase
            .from("appointments")
            .select("appointment_date, patient:patients(id, patient_id, blood_group, chronic_conditions, allergies, profile:profiles!patients_profile_id_fkey(full_name, phone, email))")
            .eq("doctor_id", doctorId)
            .not("appointment_number", "like", "APT-HIST-%");
          if (error) throw error;
          const rows = (data || []) as unknown as Array<{ appointment_date: string; patient: PatientDetailRow | null }>;
          const byPatient = new Map<string, { patient: PatientDetailRow; visits: number; lastVisit: string }>();
          for (const r of rows) {
            if (!r.patient?.id) continue;
            const entry = byPatient.get(r.patient.id) || { patient: r.patient, visits: 0, lastVisit: r.appointment_date };
            entry.visits += 1;
            if (r.appointment_date > entry.lastVisit) entry.lastVisit = r.appointment_date;
            byPatient.set(r.patient.id, entry);
          }
          let entries = Array.from(byPatient.values());
          if (patientName) {
            entries = entries.filter((e) => e.patient.profile?.full_name?.toLowerCase().includes(patientName));
          }
          return entries.map((e) => ({
            name: e.patient.profile?.full_name || "Unknown",
            patientId: e.patient.patient_id,
            phone: e.patient.profile?.phone,
            email: e.patient.profile?.email,
            bloodGroup: e.patient.blood_group,
            chronicConditions: e.patient.chronic_conditions || [],
            allergies: e.patient.allergies || [],
            visitCount: e.visits,
            lastVisit: e.lastVisit,
          }));
        }

        case "get_my_patient_reports": {
          const patientName = typeof args.patientName === "string" ? args.patientName.toLowerCase() : undefined;
          const { data: apptRows, error: apptError } = await supabase
            .from("appointments")
            .select("patient:patients(id, profile:profiles!patients_profile_id_fkey(full_name))")
            .eq("doctor_id", doctorId)
            .not("appointment_number", "like", "APT-HIST-%");
          if (apptError) throw apptError;
          let myPatients = ((apptRows || []) as any[])
            .map((r) => r.patient)
            .filter((p, i, arr) => p?.id && arr.findIndex((x) => x?.id === p.id) === i);
          if (patientName) {
            myPatients = myPatients.filter((p) => p.profile?.full_name?.toLowerCase().includes(patientName));
          }
          if (myPatients.length === 0) return { reports: [], note: "No matching patient found under this doctor's care." };

          const { data, error } = await supabase
            .from("medical_reports")
            .select("report_type, title, ai_summary, ai_diseases, is_processed, created_at, patient_id")
            .in("patient_id", myPatients.map((p) => p.id))
            .order("created_at", { ascending: false });
          if (error) throw error;
          const nameById = new Map(myPatients.map((p) => [p.id, p.profile?.full_name || "Unknown"]));
          return {
            count: (data || []).length,
            reports: (data || []).map((r: any) => ({
              patient: nameById.get(r.patient_id),
              type: r.report_type,
              title: r.title,
              summary: r.ai_summary,
              flaggedConditions: r.ai_diseases || [],
              processed: r.is_processed,
              date: r.created_at,
            })),
          };
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
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* leave empty */ }
        let result: unknown;
        try {
          result = await runTool(tc.function.name, args);
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
