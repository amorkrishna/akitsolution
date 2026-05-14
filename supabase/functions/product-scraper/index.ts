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
      return new Response(JSON.stringify({ error: "Gemini API Key missing on server secrets." }), { status: 200, headers: corsHeaders });
    }

    let searchUrl = url || (keyword ? `https://www.google.com/search?q=${encodeURIComponent(keyword + " price in Bangladesh")}` : "");
    if (!searchUrl) return new Response(JSON.stringify({ error: "URL or keyword is required" }), { status: 200, headers: corsHeaders });

    if (!searchUrl.startsWith("http")) searchUrl = `https://${searchUrl}`;

    console.log("Ultimate Scraping:", searchUrl);

    let html = "";
    
    // STRATEGY 1: Direct Fetch with specialized headers
    try {
      const resp = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        },
      });
      if (resp.ok) html = await resp.text();
    } catch (e) { console.log("Direct failed"); }

    // STRATEGY 2: AllOrigins Proxy
    if (!html || html.length < 1000) {
      try {
        const proxyRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`);
        if (proxyRes.ok) {
          const data = await proxyRes.json();
          html = data.contents;
        }
      } catch (e) { console.log("Proxy 1 failed"); }
    }

    // STRATEGY 3: Alternative CORS Proxy
    if (!html || html.length < 1000) {
      try {
        const proxyRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(searchUrl)}`);
        if (proxyRes.ok) html = await proxyRes.text();
      } catch (e) { console.log("Proxy 2 failed"); }
    }

    if (!html || html.length < 500) {
      return new Response(JSON.stringify({ error: "Could not reach the target site after 3 attempts. Please try keyword search with a different term." }), { 
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Clean and Parse
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 28000);

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `Extract products from this content. Be very aggressive in finding names and prices. 
            Format: { "products": [{ "name": "...", "price": number, "image_url": "...", "description": "...", "brand": "...", "category": "...", "original_price": "...", "discount_percentage": number }] }
            Categories: CCTV, Networking, Accessories, Computer, Printer, Software, Server, Storage, Smart Home, Audio/Video, Mobile, Other.
            Content: ${textContent}` 
          }] 
        }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      }),
    });

    const aiData = await geminiRes.json();
    const result = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{"products":[]}';

    return new Response(result, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, products: [] }), { status: 200, headers: corsHeaders });
  }
});
