import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";

// The forecast numbers themselves come from a deterministic linear-regression
// fit computed client-side (src/lib/forecast.ts) over real historical
// appointment counts. This function does not decide or adjust any number —
// it only turns already-computed figures into a short, plain-English
// narration for the dashboard, the same "rules decide, AI narrates" split
// used for the claims denial-risk score.
const NARRATION_SYSTEM_PROMPT = `You are a hospital operations analyst. You will be given a computed weekly appointment-volume trend (already calculated by a statistical model, not by you) and asked to summarize it for a hospital administrator in 1-2 short sentences.

Rules:
- Do not invent numbers. Only reference the figures given to you.
- Be concrete: mention the direction and rough magnitude of the trend.
- If a department is named, mention it.
- Keep it to 1-2 sentences, no bullet points, no preamble.`;

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

    const { weeklyGrowthRate, projectedGrowthPct, trend, weeksAhead, lastHistoricalCount, lastForecastCount, departmentName } = await req.json();

    if (typeof weeklyGrowthRate !== "number" || typeof projectedGrowthPct !== "number") {
      return new Response(JSON.stringify({ error: "weeklyGrowthRate and projectedGrowthPct are required numbers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent = [
      `Trend direction: ${trend}`,
      `Weekly growth rate: ${(weeklyGrowthRate * 100).toFixed(1)}%`,
      `Projected change over the next ${weeksAhead} week(s): ${projectedGrowthPct.toFixed(1)}%`,
      lastHistoricalCount !== undefined && `Last observed week: ${lastHistoricalCount} appointments`,
      lastForecastCount !== undefined && `Final forecast week: ${lastForecastCount} appointments`,
      departmentName && `Department: ${departmentName}`,
    ].filter(Boolean).join("\n");

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        messages: [
          { role: "system", content: NARRATION_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq API error (${groqRes.status}): ${errText}`);
    }

    const groqData = await groqRes.json();
    const narration = groqData.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ narration }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
