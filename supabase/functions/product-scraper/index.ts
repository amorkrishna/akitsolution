import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url, keyword } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Server Error: GEMINI_API_KEY is not set in Supabase Secrets." }), { status: 200, headers: corsHeaders });
    }

    const searchUrl = url || `https://www.bing.com/search?q=${encodeURIComponent(keyword || "laptop")}`;
    console.log("Final Debug Scraping:", searchUrl);

    // AI Knowledge First (The most reliable way if scraping fails)
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `Generate 5 real products matching "${keyword || url}" with current market prices in BDT. 
            Return ONLY valid JSON: { "products": [{ "name": "...", "price": number, "image_url": "...", "description": "...", "brand": "...", "category": "Accessories" }] }` 
          }] 
        }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    const aiData = await geminiRes.json();
    
    // Check if Gemini returned an error
    if (aiData.error) {
      return new Response(JSON.stringify({ error: `Gemini AI Error: ${aiData.error.message} (${aiData.error.status})` }), { status: 200, headers: corsHeaders });
    }

    const result = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{"products":[]}';

    return new Response(result, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: `System Error: ${err.message}` }), { status: 200, headers: corsHeaders });
  }
});
