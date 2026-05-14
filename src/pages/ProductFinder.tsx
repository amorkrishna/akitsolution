import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PackagePlus, Image as ImageIcon, Upload, Percent, Eye, EyeOff, Save, ArrowLeft, Link as LinkIcon, Wand2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = ["CCTV", "DVR/NVR", "Monitor", "Laptop", "Computer", "Networking", "Accessories", "Printer", "Keyboard/Mouse", "Server", "Mobile", "Attendance Device", "Smart Home", "Audio/Video", "Storage", "Software", "Other"];
const BRANDS = ["Dahua", "Hikvision", "TP-Link", "Uniview", "ZKTeco", "Tenda", "Ruijie", "Other"];

export default function ProductFinder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");

  const [form, setForm] = useState({
    name: "", category: "CCTV", brand: "Other", description: "", price: "", stock_quantity: "10", sku: "",
    cash_discount_price: "", discount_percentage: "0", show_in_store: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handlePriceChange = (field: "price" | "cash_discount_price", value: string) => {
    const newForm = { ...form, [field]: value };
    const regular = Number(field === "price" ? value : form.price) || 0;
    const cash = Number(field === "cash_discount_price" ? value : form.cash_discount_price) || 0;
    if (regular > 0 && cash > 0 && cash < regular) {
      newForm.discount_percentage = (((regular - cash) / regular) * 100).toFixed(1);
    } else {
      newForm.discount_percentage = "0";
    }
    setForm(newForm);
  };

  const handlePercentageChange = (value: string) => {
    const pct = Number(value) || 0;
    const regular = Number(form.price) || 0;
    const newForm = { ...form, discount_percentage: value };
    if (regular > 0 && pct > 0 && pct < 100) {
      newForm.cash_discount_price = Math.round(regular * (1 - pct / 100)).toString();
    }
    setForm(newForm);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) {
      toast.error("অনুগ্রহ করে একটি URL দিন");
      return;
    }

    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("product-scraper", { body: { url: scrapeUrl.trim() } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      const product = data?.products?.[0];
      if (product) {
        const payload = {
          name: product.name || "Untitled Product",
          category: CATEGORIES.includes(product.category) ? product.category : "Other",
          brand: BRANDS.includes(product.brand) ? product.brand : "Other",
          description: product.description || "",
          price: Number(product.price) || 0,
          stock_quantity: 10,
          discount_percentage: Number(product.discount_percentage) || 0,
          show_in_store: true,
          image_url: product.image_url || null,
        };

        const { data: inserted, error: insertError } = await supabase.from("products").insert(payload).select().single();
        if (insertError) throw insertError;

        if (product.image_url) {
           await supabase.from("product_images").insert({ product_id: inserted.id, image_url: product.image_url, sort_order: 0 });
        }

        toast.success("প্রোডাক্ট সরাসরি লিস্টে সেভ হয়েছে!");
        queryClient.invalidateQueries({ queryKey: ["products"] });
        navigate("/products");
      } else {
        toast.error("এই লিঙ্ক থেকে কোনো প্রোডাক্ট পাওয়া যায়নি");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`ইমপোর্ট ও সেভ ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      setScraping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      toast.error("প্রোডাক্টের নাম এবং রেগুলার মূল্য দিতে হবে");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        brand: form.brand,
        description: form.description,
        sku: form.sku,
        price: Number(form.price) || 0,
        stock_quantity: Number(form.stock_quantity) || 0,
        cash_discount_price: form.cash_discount_price ? Number(form.cash_discount_price) : null,
        discount_percentage: Number(form.discount_percentage) || 0,
        show_in_store: form.show_in_store,
      };

      const { data: inserted, error } = await supabase.from("products").insert(payload).select().single();
      if (error) throw error;

      let finalImageUrl = null;

      if (imageFile && inserted) {
        const ext = imageFile.name.split('.').pop();
        const filePath = `${inserted.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, imageFile, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
          finalImageUrl = data?.publicUrl;
        }
      } else if (!imageFile && imagePreview) {
        finalImageUrl = imagePreview;
      }

      if (finalImageUrl) {
        await supabase.from("products").update({ image_url: finalImageUrl } as any).eq("id", inserted.id);
        await supabase.from("product_images").insert({ product_id: inserted.id, image_url: finalImageUrl, sort_order: 0 });
      }

      toast.success("প্রোডাক্ট সফলভাবে যুক্ত হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/products");
    } catch (err: any) {
      console.error("Error adding product:", err);
      toast.error(`ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 via-primary to-accent p-8 text-primary-foreground shadow-2xl">
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/products")} className="text-white hover:bg-white/20">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-md">AI Auto Import</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
              <PackagePlus className="h-10 w-10" /> নতুন প্রোডাক্ট যোগ করুন
            </h1>
            <p className="text-primary-foreground/80 text-lg max-w-xl">
              লিঙ্ক দিয়ে ফর্ম অটো-ফিল করুন অথবা ম্যানুয়ালি নতুন প্রোডাক্ট যুক্ত করুন।
            </p>
          </div>
          <div className="hidden md:block opacity-20">
            <Wand2 className="h-32 w-32" />
          </div>
        </div>
      </div>

      <Card className="border-2 border-primary/20 shadow-lg bg-primary/5 rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 w-full">
              <Label className="text-base font-bold text-primary flex items-center gap-2">
                <LinkIcon className="h-4 w-4" /> অন্য ওয়েবসাইটের লিঙ্ক থেকে ইমপোর্ট করুন (Ryans, StarTech etc.)
              </Label>
              <Input
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="প্রোডাক্টের লিঙ্ক এখানে পেস্ট করুন..."
                className="h-14 text-base rounded-xl bg-background shadow-sm border-primary/30 focus-visible:ring-primary"
              />
            </div>
            <Button 
              onClick={handleScrape} 
              disabled={scraping} 
              className="h-14 px-8 rounded-xl text-lg font-bold shadow-md w-full md:w-auto transition-all hover:scale-105 active:scale-95 bg-green-600 hover:bg-green-700 text-white"
            >
              {scraping ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
              সরাসরি সেভ করুন
            </Button>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50">
                <CardTitle className="text-lg">প্রাথমিক তথ্য (Basic Info)</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">প্রোডাক্টের নাম (Product Name) <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="যেমন: Dahua 2MP Full Color Bullet Camera..."
                    className="h-12 text-base rounded-xl bg-muted/20"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">ক্যাটাগরি (Category)</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">ব্র্যান্ড (Brand)</Label>
                    <Select value={form.brand} onValueChange={(v) => setForm({ ...form, brand: v })}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">বিস্তারিত বিবরণ (Description)</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="প্রোডাক্টের ফিচার এবং বিস্তারিত তথ্য লিখুন..."
                    rows={6}
                    className="rounded-xl bg-muted/20 resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" /> মূল্য এবং স্টক (Pricing & Inventory)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">রেগুলার মূল্য (Regular Price) ৳ <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      value={form.price}
                      onChange={(e) => handlePriceChange("price", e.target.value)}
                      className="h-14 text-xl font-bold rounded-xl border-primary/30 focus-visible:ring-primary/20 bg-primary/5"
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">ছাড় মূল্য (Cash Discount Price) ৳</Label>
                    <Input
                      type="number"
                      value={form.cash_discount_price}
                      onChange={(e) => handlePriceChange("cash_discount_price", e.target.value)}
                      className="h-14 text-xl text-primary font-bold rounded-xl bg-muted/20"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">ডিসকাউন্ট (%)</Label>
                    <Input
                      type="number"
                      step="0.1" min="0" max="99"
                      value={form.discount_percentage}
                      onChange={(e) => handlePercentageChange(e.target.value)}
                      className="h-12 rounded-xl bg-muted/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">স্টক পরিমাণ (Stock)</Label>
                    <Input
                      type="number"
                      value={form.stock_quantity}
                      onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                      className="h-12 rounded-xl bg-muted/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">SKU / বারকোড</Label>
                    <Input
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      placeholder="Optional SKU..."
                      className="h-12 rounded-xl bg-muted/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50">
                <CardTitle className="text-lg">প্রোডাক্টের ছবি (Image)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center overflow-hidden relative group hover:border-primary/50 transition-colors">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="h-full w-full object-contain bg-white p-2" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                          <Label htmlFor="product-image" className="cursor-pointer bg-white text-black px-6 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform">
                            <Upload className="h-4 w-4" /> ছবি পরিবর্তন করুন
                          </Label>
                        </div>
                      </>
                    ) : (
                      <Label htmlFor="product-image" className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary transition-colors p-6 text-center">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                          <ImageIcon className="h-10 w-10 text-primary" />
                        </div>
                        <span className="font-bold text-lg text-foreground">ক্লিক করে ছবি আপলোড করুন</span>
                        <span className="text-sm mt-2 opacity-70">JPG, PNG up to 5MB</span>
                      </Label>
                    )}
                    <input id="product-image" type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      {form.show_in_store ? <Eye className="h-6 w-6 text-primary" /> : <EyeOff className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div>
                      <Label className="text-base font-bold block mb-1">স্টোরে দেখান (Publish)</Label>
                      <p className="text-sm text-muted-foreground">অনলাইন স্টোরে প্রোডাক্টটি দৃশ্যমান হবে</p>
                    </div>
                  </div>
                  <Switch checked={form.show_in_store} onCheckedChange={(v) => setForm({ ...form, show_in_store: v })} className="scale-110" />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={loading} className="w-full h-16 text-lg font-bold shadow-xl shadow-primary/25 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]">
              {loading ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : <Save className="h-6 w-6 mr-2" />}
              প্রোডাক্ট সেভ করুন
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
