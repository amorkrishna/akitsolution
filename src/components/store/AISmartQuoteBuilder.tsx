import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ShoppingCart, MessageCircle, Wand2, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { openWhatsApp } from "@/lib/whatsapp";
import { useCompanySettings } from "@/hooks/useCompanySettings";

type QuoteItem = {
  type: "product" | "service";
  id: string;
  name: string;
  category?: string;
  quantity: number;
  unit_price: number;
  total: number;
  reason: string;
};

type QuoteResult = {
  summary: string;
  notes: string;
  items: QuoteItem[];
  subtotal: number;
  lead_id: string | null;
};

const SUGGESTIONS_BN = [
  "৪টি ক্যামেরা দিয়ে আমার দোকানের জন্য সিসিটিভি সিস্টেম দরকার, রাতে ভালো দেখা যায়",
  "৫০ জন কর্মচারীর জন্য ফেস + ফিঙ্গারপ্রিন্ট অ্যাটেনডেন্স ডিভাইস",
  "ছোট অফিসের জন্য ৮ ক্যামেরা সিসিটিভি, ১ মাস রেকর্ডিং",
  "বাসার জন্য ২ ক্যামেরা, মোবাইল থেকে লাইভ দেখা যাবে",
];
const SUGGESTIONS_EN = [
  "I need a 4-camera CCTV system for my shop with good night vision",
  "Face + fingerprint attendance device for 50 employees",
  "8-camera CCTV for small office with 30-day recording",
  "2-camera home setup with live mobile view",
];

export function AISmartQuoteBuilder({
  language = "bn",
  trigger,
}: {
  language?: "bn" | "en";
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [requirement, setRequirement] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const addToCart = useCartStore((s) => s.addItem);
  const { settings } = useCompanySettings();

  const isBn = language === "bn";
  const t = (bn: string, en: string) => (isBn ? bn : en);

  const handleGenerate = async () => {
    if (requirement.trim().length < 8) {
      toast.error(t("আরো বিস্তারিত লিখুন", "Please describe in more detail"));
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key is not configured.");

      // Fetch products and services from Supabase
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

      const userPrompt = `Customer requirement: "${requirement.trim()}"\n\nAvailable catalog:\n${JSON.stringify(catalog)}`;

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt,
      });

      const response = await model.generateContent(userPrompt);
      let content = response.response.text();
      
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

      if (!validItems.length) {
        toast.error(t("কোনো মিলিয়ে পণ্য পাওয়া যায়নি", "No matching items found"));
        setLoading(false);
        return;
      }

      const subtotal = validItems.reduce((s: number, i: any) => s + i.total, 0);

      // Attempt to save lead
      let lead_id = null;
      if (customerName && customerPhone) {
        try {
          // Fire and forget insertion, won't block if RLS fails without select
          const { error: dbErr } = await supabase.from("leads").insert({
            name: customerName,
            phone: customerPhone,
            service_type: "AI Quote",
            source: "AI Quote Builder",
            status: "new",
            message: requirement,
            notes: `AI generated quote — Subtotal ৳${subtotal.toLocaleString()}\n\nItems:\n${validItems.map((i: any) => `• ${i.name} ×${i.quantity} = ৳${i.total.toLocaleString()}`).join("\n")}\n\n${parsed.notes || ""}`,
          });
          if (!dbErr) lead_id = "generated";
        } catch (e) {
          console.warn("Failed to insert lead, ignoring RLS error:", e);
        }
      }

      const quoteResult: QuoteResult = {
        summary: parsed.summary || "",
        notes: parsed.notes || "",
        items: validItems,
        subtotal,
        lead_id,
      };

      setResult(quoteResult);
      if (lead_id) {
        toast.success(t("কোট তৈরি হয়েছে — আমরা যোগাযোগ করবো", "Quote created — we'll reach out"));
      }

    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("ত্রুটি ঘটেছে", "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  const addAllToCart = () => {
    if (!result) return;
    let added = 0;
    result.items.forEach((it) => {
      if (it.type !== "product") return;
      addToCart({
        id: it.id,
        product_id: it.id,
        name: it.name,
        price: it.unit_price,
        image_url: null,
        type: "product",
        quantity: it.quantity,
      });
      added += 1;
    });
    toast.success(t(`${added} টি পণ্য কার্টে যোগ হয়েছে`, `${added} products added to cart`));
    setOpen(false);
  };

  const sendWhatsApp = () => {
    if (!result) return;
    const phone = settings?.whatsapp_number || settings?.phone || "";
    const lines = result.items.map(
      (i) => `• ${i.name} ×${i.quantity} = ৳${i.total.toLocaleString()}`
    ).join("\n");
    const msg = t(
      `🛒 *AI Smart Quote*\n\n${customerName ? `👤 ${customerName}\n` : ""}${customerPhone ? `📞 ${customerPhone}\n\n` : "\n"}📝 *চাহিদা:* ${requirement}\n\n📦 *আইটেম:*\n${lines}\n\n💰 *মোট:* ৳${result.subtotal.toLocaleString()}\n\n${result.notes || ""}`,
      `🛒 *AI Smart Quote*\n\n${customerName ? `👤 ${customerName}\n` : ""}${customerPhone ? `📞 ${customerPhone}\n\n` : "\n"}📝 *Requirement:* ${requirement}\n\n📦 *Items:*\n${lines}\n\n💰 *Total:* ৳${result.subtotal.toLocaleString()}\n\n${result.notes || ""}`
    );
    openWhatsApp(phone, msg);
  };

  const reset = () => {
    setResult(null);
    setRequirement("");
  };

  const suggestions = isBn ? SUGGESTIONS_BN : SUGGESTIONS_EN;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-lg shadow-primary/30 gap-2"
          >
            <Sparkles className="h-5 w-5" />
            {t("AI স্মার্ট কোট", "AI Smart Quote")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Wand2 className="h-6 w-6 text-primary" />
            {t("AI স্মার্ট কোট বিল্ডার", "AI Smart Quote Builder")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t(
              "শুধু আপনার প্রয়োজন বলুন — AI সঠিক পণ্য, পরিমাণ ও মূল্য সাজিয়ে দিবে",
              "Just describe your need — AI picks the right products, quantity & price"
            )}
          </p>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{t("আপনার চাহিদা", "Your requirement")} *</Label>
              <Textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder={t(
                  "যেমন: আমার দোকানের জন্য ৪টি HD ক্যামেরা, রাতের জন্য ভালো, ১ মাস রেকর্ডিং চাই",
                  "e.g. 4 HD cameras for my shop, good night vision, 1-month recording"
                )}
                rows={4}
                className="resize-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRequirement(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary/60 hover:bg-secondary text-secondary-foreground border border-border transition"
                  >
                    {s.length > 50 ? s.slice(0, 50) + "…" : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block">{t("নাম (ঐচ্ছিক)", "Name (optional)")}</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t("আপনার নাম", "Your name")}
                />
              </div>
              <div>
                <Label className="mb-2 block">{t("ফোন (ঐচ্ছিক)", "Phone (optional)")}</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                "নাম ও ফোন দিলে আমরা সাথে সাথে আপনাকে ফলোআপ করতে পারবো",
                "Adding name & phone lets us follow up with you instantly"
              )}
            </p>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("AI চিন্তা করছে...", "AI is thinking...")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t("কোট তৈরি করুন", "Generate Quote")}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </div>
            </div>

            <div className="space-y-2">
              {result.items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40 border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{it.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {it.type === "service" ? t("সেবা", "Service") : t("পণ্য", "Product")}
                      </Badge>
                      {it.category && (
                        <Badge variant="secondary" className="text-xs">{it.category}</Badge>
                      )}
                    </div>
                    {it.reason && (
                      <p className="text-xs text-muted-foreground mt-1">{it.reason}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      ৳{it.unit_price.toLocaleString()} × {it.quantity}
                    </p>
                  </div>
                  <div className="text-right font-semibold whitespace-nowrap">
                    ৳{it.total.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
              <span className="font-semibold">{t("মোট", "Total")}</span>
              <span className="text-2xl font-bold text-primary">
                ৳{result.subtotal.toLocaleString()}
              </span>
            </div>

            {result.notes && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-3">
                {result.notes}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button onClick={addAllToCart} className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                {t("কার্টে যোগ", "Add to Cart")}
              </Button>
              <Button onClick={sendWhatsApp} variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                {t("WhatsApp", "WhatsApp")}
              </Button>
              <Button onClick={reset} variant="ghost" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {t("আবার", "Try Again")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}