import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Copy, RefreshCw, Facebook, Twitter, Instagram, MessageCircle, Globe, Save, Zap, ArrowRight, CheckCircle2, Wand2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

const platforms = [
  { id: "facebook", label: "Facebook", icon: Facebook, gradient: "from-[#1877F2] to-[#0d65d9]" },
  { id: "instagram", label: "Instagram", icon: Instagram, gradient: "from-[#833AB4] via-[#E1306C] to-[#FD1D1D]" },
  { id: "twitter", label: "Twitter/X", icon: Twitter, gradient: "from-slate-800 to-slate-900" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, gradient: "from-[#25D366] to-[#128C7E]" },
  { id: "google_seo", label: "Google SEO", icon: Globe, gradient: "from-[#4285F4] to-[#34A853]" },
];

const campaignTypes = [
  { id: "product_launch", label: "🚀 Product Launch", desc: "নতুন প্রোডাক্ট লঞ্চ" },
  { id: "discount_offer", label: "💰 Discount Offer", desc: "ডিসকাউন্ট অফার" },
  { id: "brand_awareness", label: "🏢 Brand Awareness", desc: "ব্র্যান্ড পরিচিতি" },
  { id: "seasonal", label: "🎉 Seasonal", desc: "সিজনাল ক্যাম্পেইন" },
  { id: "service_promo", label: "🔧 Service Promo", desc: "সার্ভিস প্রমোশন" },
];

export function AIContentGenerator() {
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState("facebook");
  const [campaignType, setCampaignType] = useState("product_launch");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [language, setLanguage] = useState("bn");
  const [customInstructions, setCustomInstructions] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["marketing-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, description, price").eq("show_in_store", true).order("name");
      return data || [];
    },
  });

  const { data: marketingSettings } = useQuery({
    queryKey: ["marketing-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("marketing_settings").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
  });

  const handleProductSelect = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (product) { setProductName(product.name); setProductDescription(product.description || ""); setProductPrice(String(product.price)); }
  };

  const generateContent = async () => {
    setIsGenerating(true);
    try {
      const socialLinks: string[] = [];
      if (marketingSettings?.facebook_page_url) socialLinks.push(`Facebook: ${marketingSettings.facebook_page_url}`);
      if (marketingSettings?.instagram_handle) socialLinks.push(`Instagram: ${marketingSettings.instagram_handle}`);
      if (marketingSettings?.twitter_handle) socialLinks.push(`Twitter: ${marketingSettings.twitter_handle}`);
      if (marketingSettings?.whatsapp_number) socialLinks.push(`WhatsApp: ${marketingSettings.whatsapp_number}`);
      if (marketingSettings?.website_url) socialLinks.push(`Website: ${marketingSettings.website_url}`);
      const socialContext = socialLinks.length > 0 ? `Include these social/contact links in the content where appropriate: ${socialLinks.join(", ")}` : "";
      const { data, error } = await supabase.functions.invoke("marketing-ai", {
        body: {
          platform: selectedPlatform, campaign_type: campaignType, product_name: productName,
          product_description: productDescription, product_price: productPrice, language,
          company_name: "AK IT Solution", custom_instructions: [customInstructions, socialContext].filter(Boolean).join("\n"),
        },
      });
      if (error) throw error;
      setGeneratedContent(data.content);
      toast.success("কন্টেন্ট তৈরি হয়েছে!");
    } catch (err: any) { toast.error(err.message || "কন্টেন্ট তৈরি করতে সমস্যা হয়েছে"); }
    finally { setIsGenerating(false); }
  };

  const copyContent = () => { navigator.clipboard.writeText(generatedContent); toast.success("কপি হয়েছে!"); };

  const savePost = async () => {
    if (!generatedContent) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("marketing_posts").insert({
        user_id: user.id, platform: selectedPlatform, campaign_type: campaignType,
        content: generatedContent, product_name: productName || null, status: "draft",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["marketing-posts"] });
      toast.success("পোস্ট সেভ হয়েছে!");
    } catch (err: any) { toast.error(err.message); }
    finally { setIsSaving(false); }
  };

  const platformInfo = platforms.find(p => p.id === selectedPlatform);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Settings Panel */}
      <div className="space-y-4">
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                <Wand2 className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold">AI কন্টেন্ট জেনারেটর</span>
                <p className="text-[10px] text-muted-foreground font-normal mt-0.5">প্ল্যাটফর্ম সিলেক্ট করে কন্টেন্ট তৈরি করুন</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Platform selector — visual cards */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">প্ল্যাটফর্ম</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {platforms.map(p => (
                  <button key={p.id} onClick={() => setSelectedPlatform(p.id)}
                    className={`group relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-200 ${
                      selectedPlatform === p.id 
                        ? "border-primary/40 bg-primary/5 shadow-sm" 
                        : "border-border/50 hover:border-primary/20 hover:bg-muted/30"
                    }`}>
                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center shadow-sm ${selectedPlatform === p.id ? "scale-110 shadow-md" : "group-hover:scale-105"} transition-transform`}>
                      <p.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className={`text-[9px] font-medium ${selectedPlatform === p.id ? "text-primary" : "text-muted-foreground"}`}>{p.label}</span>
                    {selectedPlatform === p.id && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign type */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">ক্যাম্পেইন টাইপ</Label>
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger className="border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {campaignTypes.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Product select */}
            {products && products.length > 0 && (
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">প্রোডাক্ট সিলেক্ট (ঐচ্ছিক)</Label>
                <Select onValueChange={handleProductSelect}>
                  <SelectTrigger className="border-border/50"><SelectValue placeholder="প্রোডাক্ট বেছে নিন..." /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — ৳{p.price}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Name & description */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">প্রোডাক্ট/সার্ভিস এর নাম</Label>
              <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Dahua 4MP IP Camera" className="border-border/50" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">বিবরণ</Label>
              <Textarea value={productDescription} onChange={e => setProductDescription(e.target.value)} placeholder="সংক্ষিপ্ত বিবরণ..." className="border-border/50" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">দাম (৳)</Label>
                <Input value={productPrice} onChange={e => setProductPrice(e.target.value)} placeholder="0" className="border-border/50" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">ভাষা</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bn">বাংলা</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">কাস্টম নির্দেশনা (ঐচ্ছিক)</Label>
              <Textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder="বিশেষ কোনো নির্দেশনা..." className="border-border/50" rows={2} />
            </div>

            {/* Social links info */}
            {marketingSettings && (marketingSettings.facebook_page_url || marketingSettings.whatsapp_number) && (
              <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  সোশ্যাল লিংক অটো যুক্ত হবে: {[
                    marketingSettings.facebook_page_url && "Facebook",
                    marketingSettings.instagram_handle && "Instagram",
                    marketingSettings.whatsapp_number && "WhatsApp",
                    marketingSettings.website_url && "Website",
                  ].filter(Boolean).join(", ")}
                </span>
              </div>
            )}

            {/* Generate button — premium CTA */}
            <Button onClick={generateContent} disabled={isGenerating} className="w-full gap-2 h-11 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/90 group-hover:from-primary/90 group-hover:to-primary transition-all" />
              <div className="relative flex items-center gap-2">
                {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />}
                <span className="font-semibold">{isGenerating ? "তৈরি হচ্ছে..." : "AI দিয়ে কন্টেন্ট তৈরি করুন"}</span>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Generated Content Panel */}
      <div className="space-y-4">
        <Card className="h-full overflow-hidden border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2.5">
                {platformInfo && (
                  <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${platformInfo.gradient} flex items-center justify-center shadow-sm`}>
                    <platformInfo.icon className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div>
                  <span className="font-bold">জেনারেটেড কন্টেন্ট</span>
                  {generatedContent && <Badge variant="secondary" className="text-[9px] ml-2 px-1.5">{selectedPlatform}</Badge>}
                </div>
              </CardTitle>
              {generatedContent && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-border/50 hover:bg-primary/5 hover:border-primary/30" onClick={copyContent}>
                    <Copy className="h-3 w-3" /> কপি
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-border/50 hover:bg-emerald-500/5 hover:border-emerald-500/30 hover:text-emerald-600" onClick={savePost} disabled={isSaving}>
                    <Save className="h-3 w-3" /> {isSaving ? "..." : "সেভ"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-border/50 hover:bg-primary/5 hover:border-primary/30" onClick={generateContent} disabled={isGenerating}>
                    <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} /> আবার
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {generatedContent ? (
              <div className="relative rounded-xl border border-border/30 min-h-[300px] overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <div className="p-4 text-sm prose prose-sm max-w-none dark:prose-invert [&>p]:leading-relaxed">
                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
                <div className="relative mb-5">
                  <div className="absolute -inset-4 bg-primary/5 rounded-full blur-xl" />
                  <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary/30" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">AI কন্টেন্ট জেনারেটর</p>
                <p className="text-xs mt-1.5 text-muted-foreground max-w-[250px]">প্ল্যাটফর্ম ও ক্যাম্পেইন টাইপ সিলেক্ট করে "তৈরি করুন" বাটনে ক্লিক করুন</p>
                <div className="flex items-center gap-1.5 mt-4 text-[10px] text-primary/60">
                  <Zap className="h-3 w-3" />
                  <span>Powered by Gemini AI • Unlimited</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
