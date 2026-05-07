import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent";

async function callGemini(apiKey: string, systemPrompt: string, messages: Array<{role: string; content: string}>, stream = true): Promise<Response> {
  const geminiMessages = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body: any = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: geminiMessages,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };

  const endpoint = stream
    ? `${GEMINI_API_URL}?key=${apiKey}&alt=sse`
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, session_id } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all context data in parallel
    const [productsRes, servicesRes, portfolioRes, reviewsRes, servicingRes] = await Promise.all([
      supabase.from("products").select("id, name, price, category, brand, description, stock_quantity, discount_percentage, cash_discount_price, show_in_store").eq("show_in_store", true).limit(200),
      supabase.from("services").select("id, name, price, category, description, status").eq("status", "active").limit(50),
      supabase.from("portfolio_projects").select("title, category, client_name, location, description, is_featured").order("created_at", { ascending: false }).limit(20),
      supabase.from("customer_reviews").select("reviewer_name, reviewer_role, rating, review_text").eq("is_published", true).order("sort_order").limit(10),
      supabase.from("servicing").select("category, description, client_name, status").order("created_at", { ascending: false }).limit(20),
    ]);

    const products = productsRes.data || [];
    const services = servicesRes.data || [];
    const portfolio = portfolioRes.data || [];
    const reviews = reviewsRes.data || [];
    const recentServicing = servicingRes.data || [];

    const productCatalog = products.map(p => {
      const discounted = p.discount_percentage ? Math.round(p.price * (1 - p.discount_percentage / 100)) : null;
      return `- ${p.name} | ৳${p.price}${discounted ? ` (${p.discount_percentage}% ছাড়ে ৳${discounted})` : ""}${p.cash_discount_price ? ` | ক্যাশ: ৳${p.cash_discount_price}` : ""} | ক্যাটাগরি: ${p.category} | ব্র্যান্ড: ${p.brand || "N/A"} | স্টক: ${p.stock_quantity > 0 ? "আছে" : "নেই"}${p.description ? ` | বিবরণ: ${p.description.substring(0, 100)}` : ""}`;
    }).join("\n");

    const serviceCatalog = services.map(s =>
      `- ${s.name} | ৳${s.price} | ক্যাটাগরি: ${s.category}${s.description ? ` | ${s.description.substring(0, 80)}` : ""}`
    ).join("\n");

    const portfolioText = portfolio.length > 0
      ? portfolio.map(p => `- ${p.title} | ক্যাটাগরি: ${p.category}${p.client_name ? ` | ক্লায়েন্ট: ${p.client_name}` : ""}${p.location ? ` | লোকেশন: ${p.location}` : ""}${p.is_featured ? " ⭐" : ""}`).join("\n")
      : "কোনো প্রজেক্ট নেই";

    const reviewsText = reviews.length > 0
      ? reviews.map(r => `- ${r.reviewer_name}${r.reviewer_role ? ` (${r.reviewer_role})` : ""}: "${r.review_text}" — ⭐${r.rating}/5`).join("\n")
      : "";

    const servicingCategories = [...new Set(recentServicing.map(s => s.category))].join(", ");

    const systemPrompt = `তুমি "AK IT Solution" এর AI সহকারী। তোমার নাম "AK Assistant"। তুমি একজন অভিজ্ঞ সেলস ও টেকনিক্যাল কনসালটেন্ট।

## ভাষার নিয়ম (অত্যন্ত গুরুত্বপূর্ণ)
- **সবসময় বাংলায় কথা বলবে** — ডিফল্ট ভাষা বাংলা। কাস্টমার ইংরেজিতে লিখলেও বাংলায় উত্তর দাও, যদি না কাস্টমার স্পষ্টভাবে ইংরেজিতে চায়।
- **একদম সহজ, মুখের ভাষায় কথা বলবে** — যেমন মানুষ দোকানে গিয়ে কথা বলে, সেভাবে। কঠিন/ফর্মাল শব্দ এড়িয়ে চলো।
- **ইংরেজি শব্দ যতটা সম্ভব এড়াও** — "product" না বলে "জিনিস" বা "মাল" বলো, "discount" না বলে "ছাড়" বলো।
- **আন্তরিক ও বন্ধুত্বপূর্ণ ভাষা ব্যবহার করো** — "ভাই", "আপু", "জি" এভাবে সম্বোধন করো।
- **বানলিশ (বাংলা + ইংরেজি মিশ্রিত) বুঝতে পারবে** — কাস্টমার যদি "camera lagabo", "dam koto" এভাবে লেখে, সেটাও বুঝবে এবং বাংলায় উত্তর দিবে।

## তোমার মূল দায়িত্ব

### ১. টেকনিক্যাল এক্সপার্ট হিসেবে কাজ করা
তুমি নিচের বিষয়গুলোতে গভীর জ্ঞান রাখো:

**CCTV সিস্টেম:**
- IP ক্যামেরা vs Analog ক্যামেরা: IP ক্যামেরা রিমোট অ্যাক্সেস দেয়, উচ্চ রেজোলিউশন (2MP-8MP)।
- NVR vs DVR: NVR IP ক্যামেরার জন্য (নেটওয়ার্ক ভিত্তিক), DVR এনালগ ক্যামেরার জন্য।
- মেগাপিক্সেল গাইড: ছোট রুম (2MP যথেষ্ট), দোকান/অফিস (2MP-4MP), বড় এলাকা (4MP-8MP)।

**অ্যাটেনডেন্স ডিভাইস:**
- ফিঙ্গারপ্রিন্ট, ফেস রিকগনিশন, কার্ড বেসড, পিন কোড ভিত্তিক।

**নেটওয়ার্কিং:**
- রাউটার, সুইচ, অ্যাক্সেস পয়েন্ট, ক্যাবলিং।

**IT সার্ভিস:**
- কম্পিউটার/ল্যাপটপ সেটআপ, সফটওয়্যার ইনস্টল, নেটওয়ার্ক কনফিগারেশন, সার্ভার সেটআপ।

### ২. স্মার্ট সেলস টেকনিক
- প্রথমে প্রিমিয়াম প্রোডাক্ট দেখাও, তারপর মিড-রেঞ্জ।
- সোশ্যাল প্রুফ ও সফল প্রজেক্টের রেফারেন্স দাও।
- ক্রস-সেলিং: ক্যামেরা নিলে DVR/NVR, হার্ডডিস্ক, ইনস্টলেশন সার্ভিস সাজেস্ট করো।

### ৩. আপত্তি হ্যান্ডলিং
- "দাম বেশি" → ওয়ারেন্টি ও ভ্যালু বুঝিয়ে বলো, ক্যাশ পেমেন্টে ছাড়ের কথা বলো।
- "ভেবে দেখি" → সীমিত সময়ের অফারের কথা বলো, নম্বর নিয়ে রাখো।

### ৪. কাস্টমারের তথ্য সংগ্রহ (অত্যন্ত গুরুত্বপূর্ণ)
- কথোপকথনে ২-৩টি মেসেজ পর স্বাভাবিকভাবে কাস্টমারের নাম ও ফোন নম্বর জানতে চাও।

### ৫. WhatsApp এ অর্ডার পাঠানো
কাস্টমার অর্ডার করতে চাইলে WhatsApp অর্ডার লিংক তৈরি করো:
- লিংক ফরম্যাট: \`[📱 WhatsApp এ অর্ডার করুন](https://wa.me/8801919060590?text=ORDER_TEXT)\`
- ORDER_TEXT অবশ্যই URL encoded হতে হবে
- কাস্টমার সরাসরি ফোনে কথা বলতে চাইলে বলো: "📞 এই নম্বরে কল করুন: 01919-060590"

## দোকানের তথ্য
- নাম: AK IT Solution
- ঠিকানা: Suvastu Arcade (ICT Bhaban), Lift-6, Shop-44, 45, 74/3, S.C.C Road, Mohottuli, Dhaka
- ফোন: 01919-060590, 01762-060590
- WhatsApp: 8801919060590
- ইমেইল: akitsolution77@gmail.com
- ডেলিভারি: ঢাকার মধ্যে ১-২ দিন, ঢাকার বাইরে ২-৫ দিন
- পেমেন্ট: bKash, Nagad, Rocket, ক্যাশ, ব্যাংক ট্রান্সফার
- সার্ভিসিং: ${servicingCategories || "CCTV, Networking, Computer"} ক্যাটাগরিতে সার্ভিসিং দিচ্ছি

## প্রোডাক্ট ক্যাটালগ
${productCatalog || "কোনো প্রোডাক্ট নেই"}

## সার্ভিস ক্যাটালগ
${serviceCatalog || "কোনো সার্ভিস নেই"}

## আমাদের সম্পন্ন প্রজেক্ট (সোশ্যাল প্রুফ হিসেবে ব্যবহার করো)
${portfolioText}

${reviewsText ? `## কাস্টমার রিভিউ (বিশ্বাসযোগ্যতা বাড়াতে উল্লেখ করো)\n${reviewsText}` : ""}

## নিয়ম:
- সবসময় বিনয়ী, পেশাদার এবং উৎসাহী থাকো
- দাম বাংলা টাকায় (৳) দেখাও
- Markdown ফরম্যাট ব্যবহার করো (বোল্ড, লিস্ট, হেডিং)
- কাস্টমার অর্ডার করতে চাইলে WhatsApp অর্ডার লিংক দাও`;

    // Save session + auto-create lead
    if (session_id) {
      try {
        const allText = messages.map((m: any) => m.content).join(" ");
        const phoneMatch = allText.match(/(?:01[3-9]\d{8}|(?:\+?88)?01[3-9]\d{8})/);
        const customerPhone = phoneMatch ? phoneMatch[0].replace(/^\+?88/, "") : null;

        let customerName: string | null = null;
        const userMessages = messages.filter((m: any) => m.role === "user");
        for (const msg of userMessages) {
          const nameMatch = msg.content.match(/(?:আমার নাম|my name is|নাম হলো|I am|আমি হলাম|আমি)\s+([^\s,.।]+(?:\s+[^\s,.।]+)?)/i);
          if (nameMatch) {
            customerName = nameMatch[1].trim();
            break;
          }
        }

        const lastUserMsg = userMessages[userMessages.length - 1]?.content || "";
        const summary = lastUserMsg.substring(0, 200);

        const allUserText = userMessages.map((m: any) => m.content).join(" ").toLowerCase();
        let serviceType = "General";
        if (allUserText.match(/cctv|ক্যামেরা|camera|সিসিটিভি|nvr|dvr/)) serviceType = "CCTV";
        else if (allUserText.match(/attendance|অ্যাটেনডেন্স|হাজিরা|fingerprint/)) serviceType = "Attendance";
        else if (allUserText.match(/network|নেটওয়ার্ক|router|রাউটার|wifi|ওয়াইফাই/)) serviceType = "Networking";
        else if (allUserText.match(/computer|কম্পিউটার|laptop|ল্যাপটপ|pc|পিসি/)) serviceType = "Computer";
        else if (allUserText.match(/service|সার্ভিস|repair|মেরামত|ঠিক/)) serviceType = "Servicing";

        await supabase.from("ai_chat_sessions").upsert({
          session_id,
          customer_phone: customerPhone,
          customer_name: customerName,
          messages: messages,
          summary,
          status: "active",
          updated_at: new Date().toISOString(),
        }, { onConflict: "session_id" });

        if (customerName && customerPhone) {
          const { data: existingLead } = await supabase.from("leads").select("id").eq("phone", customerPhone).eq("source", "AI Chat").limit(1);
          if (!existingLead || existingLead.length === 0) {
            await supabase.from("leads").insert({
              name: customerName,
              phone: customerPhone,
              source: "AI Chat",
              service_type: serviceType,
              status: "new",
              message: `AI চ্যাট থেকে স্বয়ংক্রিয়ভাবে তৈরি। আলোচনার বিষয়: ${summary}`,
              notes: `Session ID: ${session_id}`,
            });
          }
        }
      } catch (saveErr) {
        console.error("Error saving session:", saveErr);
      }
    }

    const response = await callGemini(GEMINI_API_KEY, systemPrompt, messages.slice(-20), true);

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI সার্ভিসে সমস্যা, একটু পরে আবার চেষ্টা করুন।" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE stream to OpenAI-compatible SSE format
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    (async () => {
      const reader = response.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            await writer.write(encoder.encode("data: [DONE]\n\n"));
            break;
          }
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const json = JSON.parse(line.slice(6));
                const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  const openAiChunk = {
                    choices: [{ delta: { content: text }, finish_reason: null }]
                  };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(openAiChunk)}\n\n`));
                }
              } catch { /* skip malformed */ }
            }
          }
        }
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("store-ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
