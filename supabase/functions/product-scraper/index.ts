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
      return new Response(JSON.stringify({ error: "Gemini API Key missing on server" }), { status: 200, headers: corsHeaders });
    }

    let searchUrl = url;
    if (keyword && !url) {
      searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword + " price Bangladesh")}`;
    }

    if (!searchUrl.startsWith("http")) searchUrl = `https://${searchUrl}`;

    console.log("Fetching via Proxy:", searchUrl);

    // Use a robust proxy as primary
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
    const resp = await fetch(proxyUrl);
    
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "Proxy connection failed. Please try again." }), { status: 200, headers: corsHeaders });
    }

    const data = await resp.json();
    const html = data.contents;

    if (!html || html.length < 500) {
      return new Response(JSON.stringify({ error: "Site is blocking access. Try another keyword or link." }), { status: 200, headers: corsHeaders });
    }

    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 25000);

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `Extract products from this text. 
            Return JSON: { "products": [{ "name": "...", "price": number, "image_url": "...", "description": "...", "brand": "...", "category": "...", "original_price": "...", "discount_percentage": number }] }
            Content: ${textContent}` 
          }] 
        }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    const aiData = await geminiRes.json();
    const result = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{"products":[]}';

    return new Response(result, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: corsHeaders });
  }
});
