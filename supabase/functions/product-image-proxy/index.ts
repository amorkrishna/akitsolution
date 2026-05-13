import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
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
    const { image_url, product_id, ai_edit, ai_prompt } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: "product_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // AI Edit mode
    if (ai_edit && ai_prompt && image_url) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("AI editing image for product:", product_id);

      const aiResponse = await callImageWithFallback(LOVABLE_API_KEY, {
        messages: [{
          role: "user",
          content: [
            { type: "text", text: ai_prompt },
            { type: "image_url", image_url: { url: image_url } },
          ],
        }],
        modalities: ["image", "text"],
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        return new Response(JSON.stringify({ error: `AI এডিট করতে সমস্যা, আবার চেষ্টা করুন।` }), {
          status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const editedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!editedImageUrl) {
        return new Response(JSON.stringify({ error: "AI did not return an edited image" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const base64Match = editedImageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!base64Match) {
        return new Response(JSON.stringify({ error: "Invalid base64 image from AI" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
      const base64Data = base64Match[2];
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const fileName = `${product_id}/ai_edited_${crypto.randomUUID()}.${ext}`;
      const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, bytes.buffer, { contentType, upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return new Response(JSON.stringify({ error: "Failed to upload AI-edited image" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      return new Response(JSON.stringify({ success: true, public_url: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Standard image proxy mode
    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalUrl = image_url;
    if (finalUrl.includes("daraz") || finalUrl.includes("lazada")) {
      finalUrl = finalUrl.replace(/_\d+x\d+\.(jpg|png|webp)/gi, `.$1`);
      finalUrl = finalUrl.replace(/catalog_\d+/g, "catalog");
    }
    if (finalUrl.includes("aliexpress") || finalUrl.includes("alicdn")) {
      finalUrl = finalUrl.replace(/_\d+x\d+\.(jpg|png|webp)/gi, `.$1`);
      finalUrl = finalUrl.replace(/\.jpg_\d+x\d+\.jpg/g, ".jpg");
    }
    finalUrl = finalUrl
      .replace(/-\d+x\d+\.(jpg|png|webp)/gi, `.$1`)
      .replace(/\?.*?(w|width|h|height|size|resize|fit)=\d+/gi, "");

    console.log("Downloading image:", finalUrl);

    const imgResp = await fetch(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": new URL(finalUrl).origin,
      },
    });

    if (!imgResp.ok && finalUrl !== image_url) {
      console.log("High-res failed, trying original URL");
      const fallbackResp = await fetch(image_url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "image/*" },
      });
      if (!fallbackResp.ok) {
        return new Response(JSON.stringify({ error: `Failed to download image: ${fallbackResp.status}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const contentType = fallbackResp.headers.get("content-type") || "image/jpeg";
      const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const fileName = `${product_id}/${crypto.randomUUID()}.${ext}`;
      const imageBuffer = await fallbackResp.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("product-images").upload(fileName, imageBuffer, { contentType, upsert: true });
      if (uploadError) {
        return new Response(JSON.stringify({ error: "Failed to upload image" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      return new Response(JSON.stringify({ success: true, public_url: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!imgResp.ok) {
      return new Response(JSON.stringify({ error: `Failed to download image: ${imgResp.status}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = imgResp.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const fileName = `${product_id}/${crypto.randomUUID()}.${ext}`;
    const imageBuffer = await imgResp.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("product-images").upload(fileName, imageBuffer, { contentType, upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload image" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
    return new Response(JSON.stringify({ success: true, public_url: urlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("product-image-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
