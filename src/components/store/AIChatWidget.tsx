import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Package, Search, BadgePercent, Wrench, FolderOpen, ShoppingCart, Bot, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

type Msg = { role: "user" | "assistant"; content: string };

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const quickActions = [
  { icon: Search, label: "প্রোডাক্ট খুঁজুন", message: "আমি একটা ভালো CCTV ক্যামেরা খুঁজছি, আমাকে কিছু দেখান", gradient: "from-blue-500 to-cyan-500" },
  { icon: BadgePercent, label: "দাম জানুন", message: "আপনাদের সবচেয়ে ভালো অফার কি আছে?", gradient: "from-emerald-500 to-teal-500" },
  { icon: Package, label: "প্যাকেজ বানান", message: "আমার বাসার জন্য একটা সিকিউরিটি প্যাকেজ বানিয়ে দিন", gradient: "from-violet-500 to-purple-500" },
  { icon: Wrench, label: "সার্ভিসিং দরকার", message: "আমার একটা সার্ভিসিং দরকার, কিভাবে করাতে পারি?", gradient: "from-amber-500 to-orange-500" },
  { icon: FolderOpen, label: "আমাদের কাজ দেখুন", message: "আপনারা আগে কি কি প্রজেক্ট করেছেন দেখান", gradient: "from-pink-500 to-rose-500" },
];

function generateSessionId() {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>("");

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open && !systemPrompt) {
      loadContext();
    }
  }, [open]);

  // Handle hardware back button on mobile
  useEffect(() => {
    if (open) {
      window.history.pushState({ modal: "ai-chat" }, "");
      
      const handlePopState = () => {
        setOpen(false);
      };
      
      window.addEventListener("popstate", handlePopState);
      
      return () => {
        window.removeEventListener("popstate", handlePopState);
        if (window.history.state?.modal === "ai-chat") {
          window.history.back();
        }
      };
    }
  }, [open]);

  const loadContext = async () => {
    try {
      const [productsRes, servicesRes, portfolioRes, reviewsRes, servicingRes] = await Promise.all([
        supabase.from("products").select("name, price, category, brand, description, stock_quantity, discount_percentage, cash_discount_price").eq("show_in_store", true).limit(200),
        supabase.from("services").select("name, price, category, description").eq("status", "active").limit(50),
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

      const prompt = `তুমি "AK IT Solution" এর AI সহকারী। তোমার নাম "AK Assistant"। তুমি একজন অভিজ্ঞ সেলস ও টেকনিক্যাল কনসালটেন্ট।

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

${reviewsText ? "## কাস্টমার রিভিউ (বিশ্বাসযোগ্যতা বাড়াতে উল্লেখ করো)\\n" + reviewsText : ""}

## নিয়ম:
- সবসময় বিনয়ী, পেশাদার এবং উৎসাহী থাকো
- দাম বাংলা টাকায় (৳) দেখাও
- Markdown ফরম্যাট ব্যবহার করো (বোল্ড, লিস্ট, হেডিং)
- কাস্টমার অর্ডার করতে চাইলে WhatsApp অর্ডার লিংক দাও`;
      
      setSystemPrompt(prompt);
    } catch (e) {
      console.error("Failed to load context", e);
      setSystemPrompt("তুমি AK IT Solution এর AI সহকারী।");
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);
    let assistantSoFar = "";
    
    try {
      // Save session info before calling AI
      const allText = allMessages.map((m: any) => m.content).join(" ");
      const phoneMatch = allText.match(/(?:01[3-9]\d{8}|(?:\+?88)?01[3-9]\d{8})/);
      const customerPhone = phoneMatch ? phoneMatch[0].replace(/^\+?88/, "") : null;

      let customerName: string | null = null;
      const userMessages = allMessages.filter((m: any) => m.role === "user");
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

      try {
        await supabase.from("ai_chat_sessions").upsert({
          session_id: sessionId,
          customer_phone: customerPhone,
          customer_name: customerName,
          messages: allMessages,
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
              notes: `Session ID: ${sessionId}`,
            });
          }
        }
      } catch (dbErr) {
        console.warn("Could not save session to database (likely RLS policy restriction):", dbErr);
      }

      // Gemini API Setup
      if (!GEMINI_API_KEY) throw new Error("Gemini API key is missing");
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt || "তুমি AK IT Solution এর AI সহকারী।",
      });

      const history = messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const chat = model.startChat({
        history,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      });

      const result = await chat.sendMessageStream(text);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        assistantSoFar += chunkText;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      }

      // Final upsert to include the complete assistant response
      try {
        await supabase.from("ai_chat_sessions").upsert({
          session_id: sessionId,
          messages: [...allMessages, { role: "assistant", content: assistantSoFar }],
          updated_at: new Date().toISOString(),
        }, { onConflict: "session_id" });
      } catch (dbErr) {
        console.warn("Could not save final session to database:", dbErr);
      }

    } catch (e) {
      console.error("Chat error:", e);
      if (!assistantSoFar) setMessages(prev => [...prev, { role: "assistant", content: "❌ সংযোগে সমস্যা, আবার চেষ্টা করুন।" }]);
    }
    setIsLoading(false);
  };

  return (
    <>
      {/* Floating button — premium glassmorphism */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-24 z-50 group ${open ? "hidden" : ""}`}
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full blur opacity-60 group-hover:opacity-80 transition-opacity animate-pulse" />
        <div className="relative flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 text-white shadow-xl transition-all duration-300 group-hover:scale-110 shadow-indigo-500/40">
          <div className="relative">
            <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-white/50">
              <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            </div>
          </div>
        </div>
      </button>

      {/* Chat panel — premium design */}
      {open && (
        <div className="fixed bottom-0 left-0 sm:bottom-6 sm:right-6 sm:left-auto z-50 w-full sm:w-[420px] h-[100dvh] sm:h-[620px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Outer glow */}
          <div className="absolute -inset-1 bg-gradient-to-b from-blue-500/20 via-indigo-500/10 to-purple-500/20 rounded-3xl blur-xl hidden sm:block" />
          
          <div className="relative flex flex-col h-full sm:rounded-3xl bg-background border border-border/50 shadow-2xl sm:shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden backdrop-blur-xl">
            {/* Header — gradient with depth */}
            <div className="relative shrink-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              <div className="relative px-5 py-4 flex items-center gap-3 text-white">
                <div className="relative">
                  <div className="absolute -inset-1 bg-white/20 rounded-xl blur" />
                  <div className="relative h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-indigo-600">
                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm tracking-wide">AK AI সহকারী</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Zap className="h-2.5 w-2.5 text-yellow-300" />
                    <p className="text-[10px] opacity-80 font-medium tracking-wide">টেকনিক্যাল এক্সপার্ট • সেলস কনসালটেন্ট</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 hover:bg-white/15 rounded-xl transition-colors backdrop-blur-sm">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-4">
                  {/* Welcome card */}
                  <div className="relative overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />
                    <div className="relative p-4">
                      <p className="text-sm text-foreground leading-relaxed">
                        👋 আসসালামু আলাইকুম! আমি <strong className="text-primary">AK AI সহকারী</strong>। CCTV, অ্যাটেনডেন্স, নেটওয়ার্কিং — যেকোনো IT সলিউশনে আমি আপনাকে সাহায্য করতে পারি।
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick actions — premium cards */}
                  <div className="space-y-2">
                    {quickActions.map((a, i) => (
                      <button key={i} onClick={() => sendMessage(a.message)}
                        className="w-full group flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 bg-card/50 hover:bg-primary/5 transition-all duration-200 text-left"
                      >
                        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-200`}>
                          <a.icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-medium flex-1">{a.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-sm shadow-lg shadow-blue-500/15"
                      : "bg-muted/60 text-foreground rounded-bl-sm border border-border/30 backdrop-blur-sm"
                  }`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>p]:text-sm [&>li]:text-sm">
                        <ReactMarkdown
                          components={{
                            a: ({ href, children, ...props }) => {
                              const isWhatsApp = href?.includes("wa.me");
                              if (isWhatsApp) {
                                return (
                                  <a href={href} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl no-underline transition-all mt-2 mb-1 text-sm shadow-lg shadow-green-500/20 hover:shadow-green-500/30 hover:scale-[1.02]"
                                    {...props}
                                  >
                                    <ShoppingCart className="h-4 w-4" />
                                    {children}
                                  </a>
                                );
                              }
                              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline" {...props}>{children}</a>;
                            },
                          }}
                        >{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{m.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-muted/60 rounded-2xl rounded-bl-sm px-4 py-3 border border-border/30">
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Bot className="h-3.5 w-3.5 text-white animate-pulse" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-primary font-mono tracking-wider">THINKING</span>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input — premium bottom bar */}
            <div className="border-t border-border/50 p-3 shrink-0 bg-background/80 backdrop-blur-xl">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                className="relative flex gap-2"
              >
                <div className="flex-1 relative">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="আপনার প্রশ্ন লিখুন..."
                    className="w-full bg-muted/40 rounded-xl px-4 py-2.5 text-sm border border-border/30 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button type="submit" size="icon" disabled={!input.trim() || isLoading}
                  className="rounded-xl h-10 w-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/30 hover:scale-105"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <p className="text-[9px] text-muted-foreground text-center mt-2 font-medium tracking-wide">
                Powered by <span className="text-primary">Gemini AI</span> • AK IT Solution
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
