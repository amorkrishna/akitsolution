import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_MODELS = [
  "google/gemini-3.1-flash-image-preview",
  "google/gemini-3-pro-image-preview",
];

async function callImageWithFallback(apiKey: string, body: any, modelIndex = 0, retryCount = 0): Promise<Response> {
  const model = IMAGE_MODELS[modelIndex] || IMAGE_MODELS[IMAGE_MODELS.length - 1];
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, model }),
  });

  if (response.status === 429) {
    if (retryCount < 2) {
      await new Promise(r => setTimeout(r, (retryCount + 1) * 3000));
      return callImageWithFallback(apiKey, body, modelIndex, retryCount + 1);
    }
    if (modelIndex < IMAGE_MODELS.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
      return callImageWithFallback(apiKey, body, modelIndex + 1, 0);
    }
  }
  if (response.status === 402 && modelIndex < IMAGE_MODELS.length - 1) return callImageWithFallback(apiKey, body, modelIndex + 1, 0);
  if (!response.ok && modelIndex < IMAGE_MODELS.length - 1) return callImageWithFallback(apiKey, body, modelIndex + 1, 0);
  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, style, platform } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platformSizes: Record<string, string> = {
      facebook: "1200x630 landscape",
      instagram: "1080x1080 square",
      twitter: "1600x900 landscape",
      whatsapp: "800x800 square",
      story: "1080x1920 portrait",
    };

    const sizeHint = platformSizes[platform] || platformSizes.facebook;
    const styleHint = style || "modern, professional, clean design";

    const fullPrompt = `Create a professional social media marketing post image. ${sizeHint} format.
Style: ${styleHint}
Content: ${prompt}
Make it visually striking with bold colors, clear text hierarchy, and professional branding.`;

    const response = await callImageWithFallback(LOVABLE_API_KEY, {
      messages: [{ role: "user", content: fullPrompt }],
      modalities: ["image", "text"],
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI image error:", response.status, t);
      return new Response(JSON.stringify({ error: "ইমেজ তৈরি করতে সমস্যা, আবার চেষ্টা করুন।" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textContent = data.choices?.[0]?.message?.content || "";

    if (!imageUrl) throw new Error("No image was generated");

    return new Response(JSON.stringify({ image_url: imageUrl, description: textContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
