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

    let targetUrl = url?.trim();
    if (keyword && !targetUrl) {
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword + " product price in Bangladesh")}&tbm=shop`;
    }

    if (!targetUrl.startsWith("http")) targetUrl = `https://${targetUrl}`;

    console.log("Scraping:", targetUrl);

    // Fetch the page
    const resp = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      },
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Could not reach the site (Status: ${resp.status})` }), { status: 200, headers: corsHeaders });
    }

    const html = await resp.text();
    
    // Clean content for AI
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 30000);

    // Call Gemini
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `Extract products from this text. URL: ${targetUrl}. 
            Return ONLY JSON: { "products": [{ "name": "...", "price": number, "image_url": "...", "description": "...", "brand": "...", "category": "...", "original_price": "...", "discount_percentage": number }] }
            Categories: CCTV, Networking, Accessories, Computer, Printer, Software, Server, Storage, Smart Home, Audio/Video, Mobile, Other.
            Content: ${textContent}` 
          }] 
        }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    const aiData = await geminiRes.json();
    const result = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    return new Response(result, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: corsHeaders });
  }
});
