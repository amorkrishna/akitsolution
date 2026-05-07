import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Package, Search, BadgePercent, Wrench, FolderOpen, ShoppingCart, Bot, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-ai-chat`;

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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);
    let assistantSoFar = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: allMessages, session_id: sessionId }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "সমস্যা হয়েছে" }));
        setMessages(prev => [...prev, { role: "assistant", content: `❌ ${err.error || "সমস্যা হয়েছে, আবার চেষ্টা করুন।"}` }]);
        setIsLoading(false); return;
      }
      if (!resp.body) throw new Error("No stream");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let ni: number;
        while ((ni = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, ni);
          textBuffer = textBuffer.slice(ni + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
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
        className={`fixed bottom-20 sm:bottom-6 left-4 z-50 group ${open ? "hidden" : ""}`}
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl blur opacity-60 group-hover:opacity-80 transition-opacity animate-pulse" />
        <div className="relative flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-3.5 text-white shadow-xl transition-all duration-300 group-hover:scale-105">
          <div className="relative">
            <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-white/50">
              <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            </div>
          </div>
          <span className="text-sm font-bold hidden sm:inline tracking-wide">AI সহকারী</span>
        </div>
      </button>

      {/* Chat panel — premium design */}
      {open && (
        <div className="fixed bottom-0 left-0 sm:bottom-6 sm:left-4 z-50 w-full sm:w-[420px] h-[100dvh] sm:h-[620px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
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
                    disabled={isLoading}
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
