import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || !mimeType) {
      return new Response(JSON.stringify({ error: "imageBase64 and mimeType are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert data extraction assistant for an IT hardware store.
Your task is to analyze the provided purchase bill/invoice image and extract structured data.
Respond ONLY with a valid JSON object without markdown formatting.

Expected JSON schema:
{
  "supplier_name": "Name of the supplier or distributor (String, leave empty if not found)",
  "total_cost": 0,
  "purchase_date": "YYYY-MM-DD",
  "items": [
    {
      "product_name": "Full name of the product",
      "quantity": 1,
      "unit_price": 0,
      "total_price": 0
    }
  ]
}`;

    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        role: "user",
        parts: [
          { text: "Extract the data from this bill." },
          { inlineData: { mimeType: mimeType, data: imageBase64 } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      },
    };

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error: ${res.status} ${err}`);
    }

    const json = await res.json();
    const content = json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    const parsedData = JSON.parse(content);

    return new Response(JSON.stringify({ data: parsedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-purchase-bill error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
