import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";

// Deterministic, rule-based validation against the payer_rules table.
// This is what actually decides the risk score/status — it must stay
// explainable and reproducible without depending on the LLM being available.
function runPayerRules(claim: any, patient: any, rules: any[]) {
  const errors: string[] = [];
  const riskReasons: string[] = [];
  let riskScore = 5; // baseline risk for any claim

  for (const rule of rules) {
    if (!rule.is_active) continue;

    if (rule.rule_type === "required_field" && rule.rule_key === "insurance_number") {
      if (!patient?.insurance_number) {
        errors.push("Patient has no insurance/policy number on file.");
        riskScore += 30;
      } else if (patient.insurance_expiry && new Date(patient.insurance_expiry) < new Date()) {
        errors.push(`Patient insurance expired on ${patient.insurance_expiry}.`);
        riskScore += 30;
      }
    }

    if (rule.rule_type === "required_field" && rule.rule_key === "diagnosis_summary") {
      if (!claim.diagnosis_summary?.trim()) {
        errors.push("Claim is missing a diagnosis summary.");
        riskScore += 15;
      }
    }

    if (rule.rule_type === "max_amount" && rule.rule_key === "billed_amount") {
      const max = rule.rule_value?.max ?? Infinity;
      if (Number(claim.billed_amount) > max) {
        errors.push(`Billed amount ${claim.billed_amount} exceeds the ${max} auto-review threshold.`);
        riskReasons.push("High billed amount relative to policy threshold");
        riskScore += 20;
      }
    }

    if (rule.rule_type === "code_format" && rule.rule_key === "icd_codes") {
      const pattern = new RegExp(rule.rule_value?.pattern);
      const bad = (claim.icd_codes || []).filter((c: string) => !pattern.test(c));
      if (bad.length) {
        errors.push(`Malformed ICD-10 code(s): ${bad.join(", ")}`);
        riskScore += 10 * bad.length;
      }
    }

    if (rule.rule_type === "code_format" && rule.rule_key === "cpt_codes") {
      const pattern = new RegExp(rule.rule_value?.pattern);
      const bad = (claim.cpt_codes || []).filter((c: string) => !pattern.test(c));
      if (bad.length) {
        errors.push(`Malformed CPT code(s): ${bad.join(", ")}`);
        riskScore += 10 * bad.length;
      }
    }

    if (rule.rule_type === "documentation" && rule.rule_key === "code_count") {
      const min = rule.rule_value?.min ?? 1;
      const total = (claim.icd_codes?.length || 0) + (claim.cpt_codes?.length || 0);
      if (total < min) {
        errors.push("Claim has no diagnosis or procedure codes attached.");
        riskScore += 25;
      }
    }
  }

  if ((claim.cpt_codes?.length || 0) === 0) {
    riskReasons.push("No CPT procedure code attached — payers commonly deny diagnosis-only claims");
  }

  riskScore = Math.min(100, riskScore);
  return { errors, riskReasons, riskScore };
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

    const { claim_id } = await req.json();
    if (!claim_id) {
      return new Response(JSON.stringify({ error: "claim_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const { data: claim, error: claimError } = await supabase.from("claims").select("*").eq("id", claim_id).maybeSingle();
    if (claimError) throw claimError;
    if (!claim) {
      return new Response(JSON.stringify({ error: "Claim not found or not accessible" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: patient, error: patientError } = await supabase.from("patients").select("insurance_number, insurance_provider, insurance_expiry").eq("id", claim.patient_id).maybeSingle();
    if (patientError) throw patientError;

    const { data: rules, error: rulesError } = await supabase.from("payer_rules").select("*").eq("is_active", true);
    if (rulesError) throw rulesError;

    const { errors, riskReasons, riskScore } = runPayerRules(claim, patient, rules || []);
    const status = errors.length > 0 ? "needs_review" : "validated";

    let rationale = errors.length > 0
      ? `This claim needs review: ${errors.join(" ")}`
      : `This claim passed automated validation with a denial-risk score of ${riskScore}/100.`;

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (groqApiKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqApiKey}` },
          body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0.3,
            messages: [
              {
                role: "system",
                content: "You are a hospital revenue-cycle assistant. Given a claim's validation findings and a denial-risk score that were computed by deterministic rules, write a concise 2-3 sentence plain-English explanation for a biller. Do not change the score or invent new findings — only explain the ones given.",
              },
              {
                role: "user",
                content: `Claim ${claim.claim_number}\nICD codes: ${(claim.icd_codes || []).join(", ") || "none"}\nCPT codes: ${(claim.cpt_codes || []).join(", ") || "none"}\nBilled amount: ${claim.billed_amount}\nValidation errors: ${errors.length ? errors.join("; ") : "none"}\nRisk factors: ${riskReasons.length ? riskReasons.join("; ") : "none"}\nComputed denial-risk score: ${riskScore}/100`,
              },
            ],
          }),
        });
        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const text = groqData.choices?.[0]?.message?.content?.trim();
          if (text) rationale = text;
        }
      } catch {
        // Groq phrasing is a nice-to-have; keep the deterministic rationale if it fails.
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("claims")
      .update({
        validation_errors: errors,
        denial_risk_score: riskScore,
        denial_risk_reasons: riskReasons,
        denial_risk_rationale: rationale,
        status,
      })
      .eq("id", claim_id)
      .select()
      .maybeSingle();

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ claim: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
