import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Groq's Llama 4 Scout is natively multimodal (text + image) and supports
// JSON mode — this is a real vision-model call, not OCR simulated by a
// text-only model and not a hardcoded response.
const VISION_MODEL = Deno.env.get("GROQ_VISION_MODEL") || "meta-llama/llama-4-scout-17b-16e-instruct";
const MAX_FILE_BYTES = 8 * 1024 * 1024; // keep the base64 payload comfortably under Groq's request size limit
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

const ANALYSIS_SYSTEM_PROMPT = `You are a medical document analysis assistant. You will be shown an image of a patient-uploaded medical report (lab result, prescription, discharge summary, or similar).

Rules:
- Only report what is actually visible and legible in the image. Do not invent findings.
- If the image is blurry, unreadable, or doesn't appear to be a medical document, say so plainly in the summary and return empty arrays/object for the rest — do not guess.
- Extract test results only as explicit key-value pairs that are clearly printed (e.g. "Hemoglobin: 13.5 g/dL").
- List distinct diagnosed or mentioned conditions and named medicines separately, using what's written in the document.

Respond with ONLY a JSON object of this exact shape, no prose:
{"summary": "...", "diseases": ["..."], "medicines": ["..."], "test_results": {"Hemoglobin": "13.5 g/dL"}}`;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

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

    const { report_id } = await req.json();
    if (!report_id) {
      return new Response(JSON.stringify({ error: "report_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-context client — read/update run under the calling user's own RLS.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const { data: report, error: reportError } = await supabase
      .from("medical_reports")
      .select("*")
      .eq("id", report_id)
      .maybeSingle();

    if (reportError) throw reportError;
    if (!report) {
      return new Response(JSON.stringify({ error: "Report not found or not accessible" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!report.file_url) {
      return new Response(JSON.stringify({ error: "Report has no uploaded file to analyze" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = (report.file_name || "").split(".").pop()?.toLowerCase() || "";
    if (!IMAGE_EXTENSIONS.includes(ext)) {
      return new Response(JSON.stringify({
        error: `AI analysis currently supports image uploads (${IMAGE_EXTENSIONS.join(", ")}) only — this file is a .${ext || "unknown"} file.`,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileRes = await fetch(report.file_url);
    if (!fileRes.ok) {
      throw new Error(`Could not download the uploaded file (${fileRes.status})`);
    }
    const buf = await fileRes.arrayBuffer();
    if (buf.byteLength > MAX_FILE_BYTES) {
      return new Response(JSON.stringify({ error: `File is too large to analyze (max ${MAX_FILE_BYTES / (1024 * 1024)}MB).` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const contentType = fileRes.headers.get("content-type") || `image/${ext === "jpg" ? "jpeg" : ext}`;
    const dataUri = `data:${contentType};base64,${arrayBufferToBase64(buf)}`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze this ${report.report_type || "medical"} report titled "${report.title}".` },
              { type: "image_url", image_url: { url: dataUri } },
            ],
          },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq API error (${groqRes.status}): ${errText}`);
    }

    const groqData = await groqRes.json();
    const rawContent = groqData.choices?.[0]?.message?.content || "{}";

    let parsed: { summary?: string; diseases?: string[]; medicines?: string[]; test_results?: Record<string, string> };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = { summary: "The AI response could not be parsed. Raw output: " + rawContent.slice(0, 300), diseases: [], medicines: [], test_results: {} };
    }

    const { data: updated, error: updateError } = await supabase
      .from("medical_reports")
      .update({
        ai_summary: parsed.summary || "",
        ai_diseases: parsed.diseases || [],
        ai_medicines: parsed.medicines || [],
        ai_test_results: parsed.test_results || {},
        is_processed: true,
      })
      .eq("id", report_id)
      .select()
      .maybeSingle();

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ report: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
