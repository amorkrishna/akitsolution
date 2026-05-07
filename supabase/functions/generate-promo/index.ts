import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a promotional content designer AI. Generate a structured JSON promo configuration for an animated promotional video/banner. Company: "AK IT Solution" in Dhaka, Bangladesh. Support Bengali and English.

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "title": "string",
  "subtitle": "string",
  "description": "string",
  "cta": "string",
  "theme": {
    "primary": "hex color",
    "secondary": "hex color",
    "accent": "hex color",
    "background": "hex color",
    "text": "hex color"
  },
  "animationStyle": "cinematic" | "energetic" | "elegant" | "tech" | "playful",
  "layout": "centered" | "split" | "diagonal" | "stacked",
  "elements": ["string"],
  "mood": "string",
  "companyName": "string",
  "scenes": [
    { "id": number, "duration": number, "text": "string", "subtext": "string", "animation": "fadeIn" | "slideUp" | "scaleIn" | "rotateIn" | "bounceIn" }
  ]
}`;

    let content = await callGemini(GEMINI_API_KEY, systemPrompt, prompt);
    content = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

    let promoConfig: any;
    try {
      promoConfig = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to generate promo config" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(promoConfig), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-promo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
