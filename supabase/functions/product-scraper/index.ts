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
      temperature: 0.2,
      maxOutputTokens: 4096,
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
    const { url, keyword } = await req.json();

    if (!url && !keyword) {
      return new Response(JSON.stringify({ error: "url or keyword is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl: string;
    if (keyword && !url) {
      formattedUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword + " buy price")}&tbm=shop`;
      console.log("Keyword search URL:", formattedUrl);
    } else {
      formattedUrl = url.trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`;
      }
    }

    console.log("Scraping URL:", formattedUrl);

    let pageContent = "";
    try {
      const pageResp = await fetch(formattedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });
      if (!pageResp.ok) {
        return new Response(JSON.stringify({ error: `Failed to fetch URL: ${pageResp.status}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const html = await pageResp.text();
      
      // Extract all potential image URLs including lazy-loaded ones
      const imageAttributes = ["src", "data-src", "data-original", "data-lazy", "data-srcset"];
      const foundImageUrls = new Set<string>();
      
      const imgRegex = /<img[^>]+(?:src|data-src|data-original|data-lazy|data-srcset)=["']([^"']+)["'][^>]*>/gi;
      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        if (match[1]) {
          let url = match[1].split(' ')[0]; // Handle srcset
          if (url.startsWith("//")) url = `https:${url}`;
          if (url.startsWith("http")) foundImageUrls.add(url);
        }
      }

      // Also look for background images in style attributes or common JSON patterns
      const bgImgRegex = /url\(["']?(https?:\/\/[^"']+)["']?\)/gi;
      while ((match = bgImgRegex.exec(html)) !== null) {
        if (match[1]) foundImageUrls.add(match[1]);
      }

      const imageUrls = Array.from(foundImageUrls).slice(0, 100);

      pageContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<svg[\s\S]*?<\/svg>/gi, "") // Remove SVGs to save tokens
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 35000); // Increased limit slightly

      pageContent += "\n\n--- POTENTIAL PRODUCT IMAGE URLs FOUND ON PAGE ---\n" + imageUrls.join("\n");
    } catch (fetchErr) {
      console.error("Fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: `Could not access URL: ${fetchErr instanceof Error ? fetchErr.message : "Unknown error"}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Page content length:", pageContent.length);

    const systemPrompt = `You are a product data extractor. Given webpage content, extract ALL products found. For each product extract name, price (in BDT, convert if needed: 1 USD ≈ 120 BDT, 1 CNY ≈ 16 BDT), discount_percentage, cash_discount_price, description, category, brand, image_url, original_price.

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "products": [
    {
      "name": "string",
      "price": number,
      "discount_percentage": number,
      "cash_discount_price": number | null,
      "description": "string",
      "category": "CCTV" | "Networking" | "Accessories" | "Computer" | "Printer" | "Software" | "Server" | "Storage" | "Smart Home" | "Audio/Video" | "Mobile" | "Other",
      "brand": "string",
      "image_url": "string",
      "original_price": "string"
    }
  ]
}`;

    const userPrompt = `Extract products from this webpage (URL: ${formattedUrl}):\n\n${pageContent}`;

    let content = await callGemini(GEMINI_API_KEY, systemPrompt, userPrompt);
    content = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

    let extracted: any;
    try {
      extracted = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "AI could not extract products", products: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Extracted products:", extracted.products?.length || 0);

    return new Response(JSON.stringify({ success: true, products: extracted.products || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("product-scraper error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
