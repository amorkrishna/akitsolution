import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, image_url, page_id } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FB_PAGE_ACCESS_TOKEN = Deno.env.get("FB_PAGE_ACCESS_TOKEN");
    if (!FB_PAGE_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "Facebook Page Access Token not configured. Please add it in settings." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FB_PAGE_ID = page_id || Deno.env.get("FB_PAGE_ID");
    if (!FB_PAGE_ID) {
      return new Response(JSON.stringify({ error: "Facebook Page ID not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const graphApiVersion = "v25.0";
    let result;

    if (image_url) {
      // Post with photo
      const url = `https://graph.facebook.com/${graphApiVersion}/${FB_PAGE_ID}/photos`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: image_url,
          message: message,
          access_token: FB_PAGE_ACCESS_TOKEN,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Facebook API error:", JSON.stringify(errorData));
        const fbError = errorData.error?.message || "Facebook API error";
        throw new Error(fbError);
      }

      result = await response.json();
    } else {
      // Text-only post
      const url = `https://graph.facebook.com/${graphApiVersion}/${FB_PAGE_ID}/feed`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          access_token: FB_PAGE_ACCESS_TOKEN,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Facebook API error:", JSON.stringify(errorData));
        const fbError = errorData.error?.message || "Facebook API error";
        throw new Error(fbError);
      }

      result = await response.json();
    }

    return new Response(JSON.stringify({ 
      success: true, 
      post_id: result.post_id || result.id,
      message: "Successfully posted to Facebook!" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("facebook-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
