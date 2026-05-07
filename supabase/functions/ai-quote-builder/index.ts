import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string, temperature = 0.4): Promise<string> {
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { temperature, maxOutputTokens: 4096 },
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
    const { requirement, customer_name, customer_phone, language } = await req.json();
    if (!requirement || typeof requirement !== "string") {
      return new Response(JSON.stringify({ error: "requirement is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: products } = await supabase
      .from("products")
      .select("id, name, category, brand, price, stock_quantity, description")
      .eq("show_in_store", true)
      .gt("stock_quantity", 0)
      .limit(300);

    const { data: services } = await supabase
      .from("services")
      .select("id, name, category, price, description")
      .eq("status", "active")
      .limit(100);

    const catalog = {
      products: (products || []).map(p => ({
        id: p.id, name: p.name, category: p.category, brand: p.brand,
        price: Number(p.price), stock: p.stock_quantity, desc: p.description?.slice(0, 120) || "",
      })),
      services: (services || []).map(s => ({
        id: s.id, name: s.name, category: s.category, price: Number(s.price),
      })),
    };

    const lang = language === "en" ? "English" : "Bengali (Bangla)";
    const systemPrompt = `You are AK IT Solution's expert sales engineer for CCTV, attendance devices, networking and IT equipment in Bangladesh. Currency is BDT (৳).

You will receive a customer requirement. Pick the BEST matching products and services from the provided catalog ONLY. Never invent items. Recommend reasonable quantities (e.g. cables, connectors, hard drive sized for camera count, DVR/NVR matching channel count, monitor if needed, installation service).

Respond in ${lang} for human-readable fields. Be concise, practical, and price-conscious.

Return ONLY valid JSON (no markdown, no code blocks), with this exact shape:
{
  "summary": "1-2 sentence summary of what was selected and why",
  "items": [
    { "type": "product" | "service", "id": "<catalog id>", "name": "<exact catalog name>", "quantity": <int>, "unit_price": <number>, "reason": "<short why>" }
  ],
  "notes": "any installation/warranty/delivery note (1-2 lines)"
}`;

    const userPrompt = `Customer requirement: "${requirement}"

Available catalog (use these IDs and prices exactly):
${JSON.stringify(catalog)}`;

    let content = await callGemini(apiKey, systemPrompt, userPrompt, 0.4);

    // Strip markdown code fences if Gemini wraps response
    content = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = { summary: content, items: [], notes: "" }; }

    const productMap = new Map(catalog.products.map(p => [p.id, p]));
    const serviceMap = new Map(catalog.services.map(s => [s.id, s]));
    const validItems = (parsed.items || []).map((it: any) => {
      const ref = it.type === "service" ? serviceMap.get(it.id) : productMap.get(it.id);
      if (!ref) return null;
      const qty = Math.max(1, parseInt(it.quantity) || 1);
      return {
        type: it.type,
        id: it.id,
        name: ref.name,
        category: (ref as any).category,
        quantity: qty,
        unit_price: Number(ref.price),
        total: Number(ref.price) * qty,
        reason: String(it.reason || "").slice(0, 200),
      };
    }).filter(Boolean);

    const subtotal = validItems.reduce((s: number, i: any) => s + i.total, 0);

    let lead_id: string | null = null;
    if (customer_name && customer_phone) {
      const { data: lead } = await supabase
        .from("leads")
        .insert({
          name: customer_name,
          phone: customer_phone,
          service_type: "AI Quote",
          source: "AI Quote Builder",
          status: "new",
          message: requirement,
          notes: `AI generated quote — Subtotal ৳${subtotal.toLocaleString()}\n\nItems:\n${validItems.map((i: any) => `• ${i.name} ×${i.quantity} = ৳${i.total.toLocaleString()}`).join("\n")}\n\n${parsed.notes || ""}`,
        })
        .select("id")
        .single();
      lead_id = lead?.id || null;
    }

    return new Response(JSON.stringify({
      summary: parsed.summary || "",
      notes: parsed.notes || "",
      items: validItems,
      subtotal,
      lead_id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("ai-quote-builder error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});