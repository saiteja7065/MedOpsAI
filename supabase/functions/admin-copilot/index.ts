import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";
const MAX_TOOL_ROUNDS = 4;

// "Rules decide, AI narrates" — same split as the forecast/claims features.
// The model never sees or invents a number on its own; it can only pick which
// tool to call, and every tool is a deterministic Supabase query. Its only
// job is choosing the right tool(s) and phrasing the result in plain English.
// APT-HIST-% appointments are synthetic daily-volume filler seeded only for
// the demand-forecast trend line, so every appointment-based tool here
// excludes them to match what the admin actually sees on screen.
const SYSTEM_PROMPT = `You are the AI Admin Copilot inside MedOps AI, a hospital administration system. You help hospital administrators understand live operations data — appointments, beds, operation theatres, doctors, patients, revenue, and insurance claims.

Rules:
- Always call a tool to fetch real data before answering any question about hospital numbers. Never invent, estimate, or round a number that didn't come from a tool result.
- Only state figures that came back from a tool call in this conversation.
- Stay strictly on hospital operations for this hospital. If asked something unrelated (general knowledge, other software, small talk beyond a greeting), briefly decline and steer back to what you can help with here.
- Be concise: this is a chat widget, not a report. Prefer 2-5 sentences or a short bullet list over long prose.
- If a tool returns zero or empty results, say so plainly instead of filling in a plausible-sounding number.
- Call at most one or two tools per question. As soon as a tool gives you enough to answer, answer — don't keep calling tools looking for a better answer.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_appointment_overview",
      description: "Real counts of appointments (today and all-time) broken down by status, plus emergency and video-consultation counts. Use for any question about appointments, bookings, emergencies, or video consultations.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_bed_status",
      description: "Real bed counts and occupancy rate, hospital-wide and broken down by department. Use for any question about beds, bed availability, or bed occupancy.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_ot_status",
      description: "Real operation theatre counts and utilization rate, hospital-wide and by department. Use for any question about OTs, operation theatres, or surgery scheduling.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_doctor_workload",
      description: "Real list of doctors ranked by consultation count and rating, optionally filtered to one department. Use for questions about doctor workload, busiest doctors, or staffing by department.",
      parameters: {
        type: "object",
        properties: {
          department: { type: "string", description: "Optional department name to filter to, e.g. 'Cardiology'." },
          limit: { type: "integer", description: "Max number of doctors to return, default 5." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_revenue_report",
      description: "Real total revenue from completed appointments, average fee, and a breakdown by department. Use for any question about revenue, billing, or income.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_claims_overview",
      description: "Real insurance claims counts by status (draft, validated, needs_review, submitted, approved, denied), total billed amount, and count of high denial-risk claims. Use for any question about claims, billing status, or denial risk.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_hospital_headcount",
      description: "Real total counts of registered patients and active doctors. Use for questions like 'how many patients/doctors do we have'.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_patient_detail",
      description: "Real detailed record(s) for a patient by name — contact info, blood group, allergies, chronic conditions, insurance, visit count, and assigned doctors. Use whenever asked for a specific patient's report or history, not just a headcount.",
      parameters: {
        type: "object",
        properties: {
          patientName: { type: "string", description: "Patient name or partial name to search for." },
        },
        required: ["patientName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_doctor_detail",
      description: "Real detailed record for a doctor by name — department, specialization, qualification, experience, consultation fee, rating, and total consultations. Use whenever asked about a specific doctor, not just aggregate workload rankings.",
      parameters: {
        type: "object",
        properties: {
          doctorName: { type: "string", description: "Doctor name or partial name to search for." },
        },
        required: ["doctorName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_patient_reports",
      description: "Real medical reports for a patient by name — type, title, AI summary, and flagged conditions. Use for any question about a patient's medical reports, test results, or records.",
      parameters: {
        type: "object",
        properties: {
          patientName: { type: "string", description: "Patient name or partial name to search for." },
        },
        required: ["patientName"],
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

    // User-context client — the admin's own RLS session, not a service-role key.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

    async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
      switch (name) {
        case "get_appointment_overview": {
          const { data, error } = await supabase
            .from("appointments")
            .select("status, type, priority, appointment_date")
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
            missed: list.filter((a) => a.status === "missed").length,
          });
          return {
            today: summarize(rows.filter((a) => a.appointment_date === today)),
            allTime: summarize(rows),
            emergencyCases: rows.filter((a) => a.type === "emergency" || a.priority === "emergency").length,
            videoConsultations: rows.filter((a) => a.type === "video").length,
          };
        }

        case "get_bed_status": {
          const { data, error } = await supabase.from("beds").select("status, room:rooms(department:departments(name))");
          if (error) throw error;
          const rows = data || [];
          const total = rows.length;
          const available = rows.filter((b: any) => b.status === "available").length;
          const occupied = rows.filter((b: any) => b.status === "occupied").length;
          const byDept = new Map<string, { total: number; occupied: number }>();
          for (const b of rows as any[]) {
            const dept = b.room?.department?.name || "Unassigned";
            const entry = byDept.get(dept) || { total: 0, occupied: 0 };
            entry.total += 1;
            if (b.status === "occupied") entry.occupied += 1;
            byDept.set(dept, entry);
          }
          return {
            total,
            available,
            occupied,
            reserved: rows.filter((b: any) => b.status === "reserved").length,
            cleaning: rows.filter((b: any) => b.status === "cleaning").length,
            maintenance: rows.filter((b: any) => b.status === "maintenance").length,
            occupancyRatePct: pct(occupied, total),
            byDepartment: Array.from(byDept.entries()).map(([department, v]) => ({ department, ...v })),
          };
        }

        case "get_ot_status": {
          const { data, error } = await supabase.from("operation_theatres").select("status, department:departments(name)");
          if (error) throw error;
          const rows = (data || []) as any[];
          const total = rows.length;
          const occupied = rows.filter((o) => o.status === "occupied").length;
          const byDept = new Map<string, { total: number; occupied: number }>();
          for (const o of rows) {
            const dept = o.department?.name || "Unassigned";
            const entry = byDept.get(dept) || { total: 0, occupied: 0 };
            entry.total += 1;
            if (o.status === "occupied") entry.occupied += 1;
            byDept.set(dept, entry);
          }
          return {
            total,
            available: rows.filter((o) => o.status === "available").length,
            occupied,
            maintenance: rows.filter((o) => o.status === "maintenance").length,
            cleaning: rows.filter((o) => o.status === "cleaning").length,
            utilizationRatePct: pct(occupied, total),
            byDepartment: Array.from(byDept.entries()).map(([department, v]) => ({ department, ...v })),
          };
        }

        case "get_doctor_workload": {
          const department = typeof args.department === "string" ? args.department : undefined;
          const limit = typeof args.limit === "number" && args.limit > 0 ? Math.min(args.limit, 20) : 5;
          // Filter by department (if any) BEFORE slicing to `limit` — doing it
          // after a DB-level .limit() would silently drop departments that
          // don't happen to be in the global top N by consultation count.
          const { data, error } = await supabase
            .from("doctors")
            .select("total_consultations, rating, specialization, department:departments(name), profile:profiles!doctors_profile_id_fkey(full_name)")
            .order("total_consultations", { ascending: false });
          if (error) throw error;
          let rows = (data || []) as any[];
          if (department) {
            rows = rows.filter((d) => d.department?.name?.toLowerCase() === department.toLowerCase());
          }
          rows = rows.slice(0, limit);
          return rows.map((d) => ({
            name: d.profile?.full_name || "Unknown",
            department: d.department?.name || "Unknown",
            specialization: d.specialization,
            consultations: d.total_consultations,
            rating: d.rating,
          }));
        }

        case "get_revenue_report": {
          const { data, error } = await supabase
            .from("appointments")
            .select("fee, status, department:departments(name)")
            .eq("status", "completed")
            .not("appointment_number", "like", "APT-HIST-%");
          if (error) throw error;
          const rows = (data || []) as any[];
          const totalRevenue = rows.reduce((s, a) => s + Number(a.fee || 0), 0);
          const byDept = new Map<string, number>();
          for (const a of rows) {
            const dept = a.department?.name || "Unassigned";
            byDept.set(dept, (byDept.get(dept) || 0) + Number(a.fee || 0));
          }
          return {
            totalRevenue,
            completedAppointments: rows.length,
            avgFee: rows.length > 0 ? Math.round(totalRevenue / rows.length) : 0,
            revenueByDepartment: Array.from(byDept.entries()).map(([department, revenue]) => ({ department, revenue })),
          };
        }

        case "get_claims_overview": {
          const { data, error } = await supabase.from("claims").select("status, billed_amount, denial_risk_score");
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

        case "get_hospital_headcount": {
          const [patients, doctors] = await Promise.all([
            supabase.from("patients").select("*", { count: "exact", head: true }),
            supabase.from("doctors").select("*", { count: "exact", head: true }),
          ]);
          return { totalPatients: patients.count || 0, totalDoctors: doctors.count || 0 };
        }

        case "get_patient_detail": {
          const nameQuery = typeof args.patientName === "string" ? args.patientName.toLowerCase().trim() : "";
          if (!nameQuery) return { error: "patientName is required" };
          // Filtered client-side (only ~single-digit-to-low-hundreds patients
          // in a hospital demo) rather than relying on PostgREST's embedded-
          // resource filter syntax, which needs an explicit !inner join to
          // behave predictably.
          const { data, error } = await supabase
            .from("patients")
            .select("id, patient_id, blood_group, chronic_conditions, allergies, insurance_provider, profile:profiles!patients_profile_id_fkey(full_name, phone, email)");
          if (error) throw error;
          const matches = ((data || []) as any[]).filter((p) => p.profile?.full_name?.toLowerCase().includes(nameQuery)).slice(0, 5);
          if (matches.length === 0) return { matches: [], note: "No patient matched that name." };
          const results = await Promise.all(matches.map(async (p) => {
            const { count } = await supabase
              .from("appointments")
              .select("*", { count: "exact", head: true })
              .eq("patient_id", p.id)
              .not("appointment_number", "like", "APT-HIST-%");
            return {
              name: p.profile?.full_name,
              patientId: p.patient_id,
              phone: p.profile?.phone,
              email: p.profile?.email,
              bloodGroup: p.blood_group,
              chronicConditions: p.chronic_conditions || [],
              allergies: p.allergies || [],
              insuranceProvider: p.insurance_provider,
              visitCount: count || 0,
            };
          }));
          return { matches: results };
        }

        case "get_doctor_detail": {
          const nameQuery = typeof args.doctorName === "string" ? args.doctorName.toLowerCase().trim() : "";
          if (!nameQuery) return { error: "doctorName is required" };
          const { data, error } = await supabase
            .from("doctors")
            .select("employee_id, specialization, qualification, experience_years, consultation_fee, rating, total_consultations, department:departments(name), profile:profiles!doctors_profile_id_fkey(full_name, phone, email)");
          if (error) throw error;
          const matches = ((data || []) as any[]).filter((d) => d.profile?.full_name?.toLowerCase().includes(nameQuery)).slice(0, 5);
          if (matches.length === 0) return { matches: [], note: "No doctor matched that name." };
          return {
            matches: matches.map((d) => ({
              name: d.profile?.full_name,
              employeeId: d.employee_id,
              department: d.department?.name,
              specialization: d.specialization,
              qualification: d.qualification,
              experienceYears: d.experience_years,
              consultationFee: d.consultation_fee,
              rating: d.rating,
              totalConsultations: d.total_consultations,
              phone: d.profile?.phone,
              email: d.profile?.email,
            })),
          };
        }

        case "get_patient_reports": {
          const nameQuery = typeof args.patientName === "string" ? args.patientName.toLowerCase().trim() : "";
          if (!nameQuery) return { error: "patientName is required" };
          const { data: patientRows, error: patientErr } = await supabase
            .from("patients")
            .select("id, profile:profiles!patients_profile_id_fkey(full_name)");
          if (patientErr) throw patientErr;
          const matches = ((patientRows || []) as any[]).filter((p) => p.profile?.full_name?.toLowerCase().includes(nameQuery));
          if (matches.length === 0) return { reports: [], note: "No patient matched that name." };

          const { data, error } = await supabase
            .from("medical_reports")
            .select("report_type, title, ai_summary, ai_diseases, is_processed, created_at, patient_id")
            .in("patient_id", matches.map((p) => p.id))
            .order("created_at", { ascending: false });
          if (error) throw error;
          const nameById = new Map(matches.map((p) => [p.id, p.profile?.full_name || "Unknown"]));
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
