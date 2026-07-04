import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";

const CODING_SYSTEM_PROMPT = `You are a certified medical coding assistant helping a hospital biller draft ICD-10-CM and CPT code suggestions from a doctor's clinical note.

Rules:
- Suggest only codes clearly supported by the note. Do not invent findings.
- For every code, include a short "rationale" that quotes or paraphrases the exact part of the note that justifies it.
- Include a "confidence" between 0 and 1 reflecting how directly the note supports the code.
- Prefer 1-4 ICD-10 diagnosis codes and 1-3 CPT procedure/E&M codes.
- If the note is too vague to support any code, return an empty "codes" array rather than guessing.

Respond with ONLY a JSON object of this exact shape, no prose:
{"codes":[{"code":"E11.9","code_type":"ICD-10","description":"Type 2 diabetes mellitus without complications","confidence":0.86,"rationale":"..."}]}`;

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

    const { clinical_note_id } = await req.json();
    if (!clinical_note_id) {
      return new Response(JSON.stringify({ error: "clinical_note_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-context client — every query below runs as the calling doctor/admin
    // and is subject to the same RLS policies as the rest of the app.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const { data: note, error: noteError } = await supabase
      .from("clinical_notes")
      .select("*")
      .eq("id", clinical_note_id)
      .maybeSingle();

    if (noteError) throw noteError;
    if (!note) {
      return new Response(JSON.stringify({ error: "Clinical note not found or not accessible" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vitalsText = note.vitals
      ? Object.entries(note.vitals).map(([k, v]) => `${k}: ${v}`).join(", ")
      : null;

    const inputText = [
      note.chief_complaint && `Chief complaint: ${note.chief_complaint}`,
      note.examination_findings && `Examination findings: ${note.examination_findings}`,
      note.diagnosis && `Diagnosis: ${note.diagnosis}`,
      note.treatment_plan && `Treatment plan: ${note.treatment_plan}`,
      note.tests_ordered?.length && `Tests ordered: ${note.tests_ordered.join(", ")}`,
      vitalsText && `Vitals: ${vitalsText}`,
      note.notes && `Additional notes: ${note.notes}`,
    ].filter(Boolean).join("\n");

    if (!inputText.trim()) {
      return new Response(JSON.stringify({ error: "Clinical note has no content to code from" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CODING_SYSTEM_PROMPT },
          { role: "user", content: `Clinical note:\n\n${inputText}` },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq API error (${groqRes.status}): ${errText}`);
    }

    const groqData = await groqRes.json();
    const rawContent = groqData.choices?.[0]?.message?.content || "{}";

    let suggestedCodes: any[] = [];
    try {
      const parsed = JSON.parse(rawContent);
      suggestedCodes = Array.isArray(parsed.codes) ? parsed.codes : [];
    } catch {
      suggestedCodes = [{
        code: "UNPARSED",
        code_type: "ICD-10",
        description: "Model response could not be parsed as JSON",
        confidence: 0,
        rationale: rawContent.slice(0, 500),
      }];
    }

    const { data: inserted, error: insertError } = await supabase
      .from("coding_suggestions")
      .insert({
        clinical_note_id: note.id,
        appointment_id: note.appointment_id,
        patient_id: note.patient_id,
        doctor_id: note.doctor_id,
        input_text: inputText,
        model: GROQ_MODEL,
        suggested_codes: suggestedCodes,
        status: "pending",
      })
      .select()
      .maybeSingle();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ suggestion: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
