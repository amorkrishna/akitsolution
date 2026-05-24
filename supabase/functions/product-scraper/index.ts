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
      return new Response(JSON.stringify({ error: "Server Error: GEMINI_API_KEY is not set in Supabase Secrets." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let promptText = "";

    if (url) {
      try {
        console.log("Fetching URL:", url);
        let htmlContent = "";
        
        const fetchWithTimeout = async (target, options = {}, timeout = 8000) => {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);
          const response = await fetch(target, { ...options, signal: controller.signal });
          clearTimeout(id);
          return response;
        };

        // 1. Try direct fetch
        try {
          const fetchRes = await fetchWithTimeout(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          if (fetchRes.ok) {
            htmlContent = await fetchRes.text();
            console.log("Direct fetch successful.");
          } else {
            throw new Error(`Direct fetch failed: ${fetchRes.status}`);
          }
        } catch (err1) {
          console.log(err1.message, "-> Falling back to codetabs proxy");
          // 2. Try codetabs proxy
          try {
            const proxyRes = await fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${url}`);
            if (proxyRes.ok) {
              htmlContent = await proxyRes.text();
              console.log("Codetabs proxy successful.");
            } else {
              throw new Error(`Codetabs failed: ${proxyRes.status}`);
            }
          } catch (err2) {
            console.log(err2.message, "-> Falling back to allorigins proxy");
            // 3. Try allorigins proxy
            const allOriginsRes = await fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            if (allOriginsRes.ok) {
              const data = await allOriginsRes.json();
              if (data.contents) {
                htmlContent = data.contents;
                console.log("Allorigins proxy successful.");
              } else {
                throw new Error("Allorigins empty contents");
              }
            } else {
              throw new Error(`Allorigins failed: ${allOriginsRes.status}`);
            }
          }
        }

        // Check if the page is a generic 404 or Cloudflare block
        const isBlocked = htmlContent.toLowerCase().includes("page you requested cannot be found") || 
                          htmlContent.toLowerCase().includes("cloudflare") ||
                          htmlContent.toLowerCase().includes("just a moment...");

        if (!htmlContent || htmlContent.length < 500 || isBlocked) {
           console.log("Scraping blocked or failed, falling back to URL slug parsing.");
           
           // Extract the last part of the URL as a keyword
           let slug = url.split('/').filter(Boolean).pop() || "";
           slug = slug.replace(/[-_]/g, ' ').replace(/\.html?/g, '').trim();
           
           promptText = `You are a product suggestion AI. Generate 3 to 5 real products matching the query "${slug}" with current market prices in BDT. 
Return ONLY valid JSON in this exact format, with no markdown formatting, no code blocks, just raw JSON: 
{ "products": [{ "name": "...", "price": number, "image_url": "...", "description": "...", "brand": "...", "category": "..." }] }`;
        } else {
           // Clean up HTML to reduce token usage
           let cleanHtml = htmlContent
             .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
             .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
             .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "");
             
           cleanHtml = cleanHtml.substring(0, 400000);

           promptText = `You are a product extraction AI. Extract the main product details from the following HTML content of a product page. 
URL: ${url}
Return ONLY valid JSON in this exact format, with no markdown formatting, no code blocks, just raw JSON: 
{ "products": [{ "name": "...", "price": number, "image_url": "...", "description": "...", "brand": "...", "category": "..." }] }

HTML Content snippet:
${cleanHtml}`;
        }
      } catch (e) {
        console.error("Error fetching URL content:", e);
        // Fallback to URL slug parsing instead of erroring out
        let slug = url.split('/').filter(Boolean).pop() || "";
        slug = slug.replace(/[-_]/g, ' ').replace(/\.html?/g, '').trim();
        promptText = `You are a product suggestion AI. Generate 3 to 5 real products matching the query "${slug}" with current market prices in BDT. 
Return ONLY valid JSON in this exact format, with no markdown formatting, no code blocks, just raw JSON: 
{ "products": [{ "name": "...", "price": number, "image_url": "...", "description": "...", "brand": "...", "category": "..." }] }`;
      }
    } else {
      console.log("Searching by keyword:", keyword);
      promptText = `You are a product suggestion AI. Generate 5 real products matching the keyword "${keyword}" with current market prices in BDT. 
Return ONLY valid JSON in this exact format, with no markdown formatting, no code blocks, just raw JSON: 
{ "products": [{ "name": "...", "price": number, "image_url": "...", "description": "...", "brand": "...", "category": "..." }] }`;
    }

    const fetchGemini = async (model: string) => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: "application/json" }
        }),
      });
      return await res.json();
    };

    console.log("Sending to Gemini API (gemini-2.5-flash)...");
    let aiData = await fetchGemini("gemini-2.5-flash");
    
    if (aiData.error && aiData.error.status === "RESOURCE_EXHAUSTED") {
       console.log("Quota exceeded for gemini-2.5-flash, falling back to gemini-2.0-flash...");
       aiData = await fetchGemini("gemini-2.0-flash");
    }

    // Check if Gemini returned an error
    if (aiData.error) {
      console.error("Gemini Error:", aiData.error);
      return new Response(JSON.stringify({ error: `Gemini AI Error: ${aiData.error.message} (${aiData.error.status})` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let result = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{"products":[]}';
    console.log("Gemini Response:", result.substring(0, 200) + "...");
    
    // Clean up response if it contains markdown code blocks
    result = result.replace(/```json\n/g, '').replace(/```\n/g, '').replace(/```/g, '');

    return new Response(result, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("System Error:", err);
    return new Response(JSON.stringify({ error: `System Error: ${err.message}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

