import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
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
  return json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { platform, product_name, product_description, product_price, campaign_type, language, company_name, custom_instructions } = await req.json();

    if (!platform || !campaign_type) {
      return new Response(JSON.stringify({ error: "platform and campaign_type are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platformGuides: Record<string, string> = {
      facebook: "Create a Facebook post. Use emojis, call-to-action, engaging text. Include hashtags. Max 500 chars.",
      instagram: "Create an Instagram caption. Heavy emoji usage, storytelling style, 5-10 relevant hashtags. Max 2200 chars.",
      twitter: "Create a Twitter/X post. Under 280 characters. Punchy, 2-3 hashtags.",
      whatsapp: "Create a WhatsApp promotional message. Use bold (*text*), emojis, bullet points.",
      google_seo: "Create SEO content: meta title (60 chars), meta description (160 chars), 5 keywords, short blog paragraph.",
    };

    const campaignTypes: Record<string, string> = {
      product_launch: "New product launch — create excitement and urgency",
      discount_offer: "Special discount — emphasize savings and limited time",
      brand_awareness: "Brand awareness — focus on trust, quality, values",
      seasonal: "Seasonal/festive — tie into current season or festival",
      service_promo: "Service promotion — highlight expertise, reliability",
    };

    const lang = language === "bn" ? "Bengali (Bangla)" : "English";

    const systemPrompt = `You are an expert digital marketing content creator for IT products in Bangladesh. 
Company: ${company_name || "AK IT Solution"}. Write in ${lang}. Be culturally relevant.
${custom_instructions ? `Additional: ${custom_instructions}` : ""}`;

    const userPrompt = `Create marketing content: ${platformGuides[platform] || platformGuides.facebook}
Campaign: ${campaignTypes[campaign_type] || campaign_type}
${product_name ? `Product: ${product_name}` : ""}
${product_description ? `Description: ${product_description}` : ""}
${product_price ? `Price: ৳${product_price}` : ""}
Return ONLY the post content.`;

    const content = await callGemini(GEMINI_API_KEY, systemPrompt, userPrompt);

    return new Response(JSON.stringify({ content, platform, campaign_type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
