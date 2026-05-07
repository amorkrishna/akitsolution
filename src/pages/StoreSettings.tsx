import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, Megaphone, Paintbrush, Layout, ImagePlus, X, Globe, Facebook, Code, BarChart3, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CategoryTilesManager } from "@/components/CategoryTilesManager";

interface StoreConfig {
  announcement_text: string;
  announcement_active: boolean;
  hero_title: string;
  hero_subtitle: string;
  theme_primary_color: string;
  layout_style: string;
  banner_images: string[];
  footer_text: string;
  facebook_url: string;
  instagram_url: string;
  youtube_url: string;
  tiktok_url: string;
  custom_css: string;
  ga_tracking_id: string;
  meta_title: string;
  meta_description: string;
  favicon_url: string;
  fb_pixel_id: string;
}

const defaults: StoreConfig = {
  announcement_text: "",
  announcement_active: false,
  hero_title: "AK IT Solution",
  hero_subtitle: "Service is our first priority",
  theme_primary_color: "#7c3aed",
  layout_style: "grid",
  banner_images: [],
  footer_text: "",
  facebook_url: "",
  instagram_url: "",
  youtube_url: "",
  tiktok_url: "",
  custom_css: "",
  ga_tracking_id: "",
  meta_title: "AK IT Solution - CCTV & IT Services in Bangladesh",
  meta_description: "Premium CCTV cameras, attendance devices, and IT solutions. Professional installation and service since 2015.",
  favicon_url: "",
  fb_pixel_id: "",
};

export default function StoreSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StoreConfig>(defaults);
  const [uploading, setUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await (supabase.from("store_settings" as any) as any).select("*").eq("user_id", user.id).maybeSingle();
      return data as any;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        announcement_text: data.announcement_text || "",
        announcement_active: data.announcement_active || false,
        hero_title: data.hero_title || defaults.hero_title,
        hero_subtitle: data.hero_subtitle || defaults.hero_subtitle,
        theme_primary_color: data.theme_primary_color || defaults.theme_primary_color,
        layout_style: data.layout_style || defaults.layout_style,
        banner_images: Array.isArray(data.banner_images) ? data.banner_images : [],
        footer_text: data.footer_text || "",
        facebook_url: data.facebook_url || "",
        instagram_url: data.instagram_url || "",
        youtube_url: data.youtube_url || "",
        tiktok_url: data.tiktok_url || "",
        custom_css: data.custom_css || "",
        ga_tracking_id: data.ga_tracking_id || "",
        meta_title: data.meta_title || defaults.meta_title,
        meta_description: data.meta_description || defaults.meta_description,
        favicon_url: data.favicon_url || "",
        fb_pixel_id: data.fb_pixel_id || "",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload = { ...form, user_id: user.id };
      const { error } = await (supabase.from("store_settings" as any) as any).upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings-public"] });
      toast({ title: "স্টোর সেটিংস সেভ হয়েছে ✅" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
      setForm(prev => ({ ...prev, banner_images: [...prev.banner_images, ...newUrls] }));
      toast({ title: `${newUrls.length}টি ব্যানার আপলোড হয়েছে ✅` });
    } catch (err: any) {
      toast({ title: "আপলোড ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeBanner = (index: number) => {
    setForm(prev => ({
      ...prev,
      banner_images: prev.banner_images.filter((_, i) => i !== index),
    }));
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `favicon/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(path);
      setForm(prev => ({ ...prev, favicon_url: urlData.publicUrl }));
      toast({ title: "ফেভিকন আপলোড হয়েছে ✅" });
    } catch (err: any) {
      toast({ title: "আপলোড ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setFaviconUploading(false);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
  };

  const update = (field: keyof StoreConfig, value: any) => setForm({ ...form, [field]: value });

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">স্টোর কাস্টমাইজেশন</h1>
          <p className="text-muted-foreground text-sm">অনলাইন স্টোরের ব্যানার, রং ও লেআউট পরিবর্তন</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />{saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
        </Button>
      </div>

      {/* Category Tiles (CCTV / Attendance / Servicing) */}
      <CategoryTilesManager />

      {/* Banner Images */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">🖼️ ব্যানার ইমেজ</CardTitle>
          <p className="text-xs text-muted-foreground">প্রস্তাবিত সাইজ: <span className="font-semibold text-primary">2100 × 500 px</span> (অনুপাত 21:5)। সর্বোচ্চ ৫টি।</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.banner_images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {form.banner_images.map((url, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-[21/5]">
                  <img src={url} alt={`Banner ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeBanner(i)}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
          {form.banner_images.length < 5 && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleBannerUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-dashed border-2 h-20"
              >
                <ImagePlus className="h-5 w-5 mr-2" />
                {uploading ? "আপলোড হচ্ছে..." : "ব্যানার ইমেজ আপলোড করুন"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcement Bar */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />অ্যানাউন্সমেন্ট বার</CardTitle>
              <CardDescription>স্টোরের উপরে অফার বা নোটিশ দেখান</CardDescription>
            </div>
            <Switch checked={form.announcement_active} onCheckedChange={v => update("announcement_active", v)} />
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.announcement_text}
            onChange={e => update("announcement_text", e.target.value)}
            placeholder="যেমন: 🎉 সব CCTV ক্যামেরায় ২০% ছাড়! সীমিত সময়ের অফার"
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Hero Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Layout className="h-5 w-5 text-primary" />হিরো সেকশন</CardTitle>
          <CardDescription>স্টোরের প্রধান শিরোনাম এবং উপশিরোনাম</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>শিরোনাম</Label>
            <Input value={form.hero_title} onChange={e => update("hero_title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>উপশিরোনাম</Label>
            <Input value={form.hero_subtitle} onChange={e => update("hero_subtitle", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Footer & Social */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5 text-primary" />ফুটার ও সোশ্যাল মিডিয়া</CardTitle>
          <CardDescription>ফুটারে কাস্টম টেক্সট ও সোশ্যাল মিডিয়া লিংক যোগ করুন</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ফুটার টেক্সট</Label>
            <Textarea
              value={form.footer_text}
              onChange={e => update("footer_text", e.target.value)}
              placeholder="যেমন: আমরা ২০১৫ সাল থেকে বাংলাদেশে IT সার্ভিস প্রদান করছি..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Facebook URL</Label>
              <Input value={form.facebook_url} onChange={e => update("facebook_url", e.target.value)} placeholder="https://facebook.com/yourpage" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Instagram URL</Label>
              <Input value={form.instagram_url} onChange={e => update("instagram_url", e.target.value)} placeholder="https://instagram.com/yourprofile" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">YouTube URL</Label>
              <Input value={form.youtube_url} onChange={e => update("youtube_url", e.target.value)} placeholder="https://youtube.com/@yourchannel" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">TikTok URL</Label>
              <Input value={form.tiktok_url} onChange={e => update("tiktok_url", e.target.value)} placeholder="https://tiktok.com/@yourprofile" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Paintbrush className="h-5 w-5 text-primary" />থিম সেটিংস</CardTitle>
          <CardDescription>স্টোরের প্রাথমিক রং পরিবর্তন</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <Label>প্রাইমারি কালার</Label>
              <div className="flex gap-2">
                <Input type="color" value={form.theme_primary_color} onChange={e => update("theme_primary_color", e.target.value)} className="w-14 h-10 p-1 cursor-pointer" />
                <Input value={form.theme_primary_color} onChange={e => update("theme_primary_color", e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="w-20 h-20 rounded-xl border" style={{ background: form.theme_primary_color }} />
          </div>
          <div className="space-y-2">
            <Label>প্রোডাক্ট লেআউট</Label>
            <div className="flex gap-2">
              {["grid", "list"].map(style => (
                <Button key={style} variant={form.layout_style === style ? "default" : "outline"} size="sm" onClick={() => update("layout_style", style)}>
                  {style === "grid" ? "গ্রিড ভিউ" : "লিস্ট ভিউ"}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom CSS */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Code className="h-5 w-5 text-primary" />কাস্টম CSS</CardTitle>
          <CardDescription>স্টোরে অতিরিক্ত CSS স্টাইল যোগ করুন। সতর্কতা: ভুল CSS স্টোরের লেআউট নষ্ট করতে পারে।</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.custom_css}
            onChange={e => update("custom_css", e.target.value)}
            placeholder={`.store-header {\n  background: linear-gradient(135deg, #667eea, #764ba2);\n}\n\n.product-card:hover {\n  transform: scale(1.02);\n}`}
            rows={6}
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      {/* Google Analytics */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Google Analytics</CardTitle>
          <CardDescription>Google Analytics Measurement ID দিন (যেমন: G-XXXXXXXXXX)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Measurement ID</Label>
            <Input
              value={form.ga_tracking_id}
              onChange={e => update("ga_tracking_id", e.target.value)}
              placeholder="G-XXXXXXXXXX"
            />
            {form.ga_tracking_id && (
              <p className="text-xs text-muted-foreground">✅ Google Analytics ট্র্যাকিং সক্রিয় হবে স্টোরে</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Facebook Pixel */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Facebook className="h-5 w-5 text-primary" />Facebook Pixel</CardTitle>
          <CardDescription>Facebook Pixel ID দিন কনভার্সন ট্র্যাকিং এর জন্য (যেমন: 123456789012345)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Pixel ID</Label>
            <Input
              value={form.fb_pixel_id}
              onChange={e => update("fb_pixel_id", e.target.value)}
              placeholder="123456789012345"
            />
            {form.fb_pixel_id && (
              <p className="text-xs text-muted-foreground">✅ Facebook Pixel ট্র্যাকিং সক্রিয় হবে স্টোরে — PageView, AddToCart, Purchase ইভেন্ট ট্র্যাক হবে</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Search className="h-5 w-5 text-primary" />SEO সেটিংস</CardTitle>
          <CardDescription>স্টোরের মেটা টাইটেল ও ডিসক্রিপশন কাস্টমাইজ করুন — Google সার্চে দেখাবে</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>মেটা টাইটেল (Meta Title)</Label>
            <Input
              value={form.meta_title}
              onChange={e => update("meta_title", e.target.value)}
              placeholder="AK IT Solution - CCTV & IT Services"
            />
            <p className="text-xs text-muted-foreground">সর্বোচ্চ ৬০ ক্যারেক্টার — ব্রাউজার ট্যাবে দেখাবে</p>
          </div>
          <div className="space-y-2">
            <Label>মেটা ডিসক্রিপশন (Meta Description)</Label>
            <Textarea
              value={form.meta_description}
              onChange={e => update("meta_description", e.target.value)}
              placeholder="Premium CCTV cameras and IT solutions in Bangladesh..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">সর্বোচ্চ ১৬০ ক্যারেক্টার — Google সার্চ রেজাল্টে দেখাবে</p>
          </div>
        </CardContent>
      </Card>

      {/* Favicon */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5 text-primary" />ফেভিকন (Favicon)</CardTitle>
          <CardDescription>ব্রাউজার ট্যাবে আপনার কোম্পানির আইকন দেখাবে। প্রস্তাবিত সাইজ: 64×64px বা 128×128px (PNG/ICO)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.favicon_url && (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg border border-border flex items-center justify-center bg-muted overflow-hidden">
                <img src={form.favicon_url} alt="Favicon" className="w-10 h-10 object-contain" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground truncate max-w-xs">{form.favicon_url.split('/').pop()}</p>
                <Button variant="ghost" size="sm" className="text-destructive mt-1" onClick={() => setForm(prev => ({ ...prev, favicon_url: "" }))}>
                  <X className="h-3.5 w-3.5 mr-1" />সরান
                </Button>
              </div>
            </div>
          )}
          <div>
            <input ref={faviconInputRef} type="file" accept="image/png,image/x-icon,image/svg+xml,image/jpeg" onChange={handleFaviconUpload} className="hidden" />
            <Button variant="outline" onClick={() => faviconInputRef.current?.click()} disabled={faviconUploading} className="w-full border-dashed border-2 h-14">
              <ImagePlus className="h-5 w-5 mr-2" />
              {faviconUploading ? "আপলোড হচ্ছে..." : "ফেভিকন আপলোড করুন"}
            </Button>
          </div>
        </CardContent>
      </Card>


      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">প্রিভিউ</CardTitle>
        </CardHeader>
        <CardContent>
          {form.announcement_active && form.announcement_text && (
            <div className="text-center text-xs font-medium py-2 px-4 rounded-lg mb-3" style={{ background: form.theme_primary_color, color: "white" }}>
              {form.announcement_text}
            </div>
          )}
          {form.banner_images.length > 0 && (
            <div className="mb-3 rounded-lg overflow-hidden">
              <img src={form.banner_images[0]} alt="Banner preview" className="w-full h-32 object-cover rounded-lg" />
              <p className="text-[10px] text-muted-foreground text-center mt-1">{form.banner_images.length}টি ব্যানার স্লাইডশো হিসেবে দেখাবে</p>
            </div>
          )}
          <div className="text-center py-6 rounded-lg border border-border bg-card">
            <h2 className="text-xl font-bold" style={{ color: form.theme_primary_color }}>{form.hero_title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{form.hero_subtitle}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
