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
import { 
  Loader2, PackagePlus, Image as ImageIcon, Upload, Percent, 
  Eye, EyeOff, Save, ArrowLeft, Link as LinkIcon, Wand2, 
  Trash2, Sparkles, CheckCircle2, AlertTriangle, Layers, Plus, ExternalLink
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = [
  "CCTV", "DVR/NVR", "Monitor", "Laptop", "Computer", "Networking", 
  "Accessories", "Printer", "Keyboard/Mouse", "Server", "Mobile", 
  "Attendance Device", "Smart Home", "Audio/Video", "Storage", "Software", "Other"
];

const BRANDS = ["Dahua", "Hikvision", "TP-Link", "Uniview", "ZKTeco", "Tenda", "Ruijie", "Other"];

interface ScrapedProduct {
  id: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  price: string;
  cash_discount_price: string;
  discount_percentage: string;
  image_url: string;
  images: string[];
  show_in_store: boolean;
  call_for_price: boolean;
  sku: string;
  stock_quantity: string;
  sourceUrl: string;
}

interface ScrapeProgress {
  url: string;
  status: "pending" | "scraping" | "success" | "failed";
  error?: string;
  productName?: string;
}

export default function ProductFinder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"batch" | "manual">("batch");
  
  // Batch states
  const [batchUrlsText, setBatchUrlsText] = useState("");
  const [progressList, setProgressList] = useState<ScrapeProgress[]>([]);
  const [scrapedProducts, setScrapedProducts] = useState<ScrapedProduct[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [isFetchingBatch, setIsFetchingBatch] = useState(false);
  
  // Bulk card assignment utilities
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkBrand, setBulkBrand] = useState("");

  // Manual States
  const [manualLoading, setManualLoading] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: "", category: "CCTV", brand: "Other", description: "", price: "", stock_quantity: "10", sku: "",
    cash_discount_price: "", discount_percentage: "0", show_in_store: true, call_for_price: false,
  });
  const [manualImageFile, setManualImageFile] = useState<File | null>(null);
  const [manualImagePreview, setManualImagePreview] = useState<string | null>(null);

  // ---------------------------------------------------------
  // Batch Actions & Scraper Code
  // ---------------------------------------------------------
  const handleBatchScrape = async () => {
    const urls = batchUrlsText
      .split("\n")
      .map(u => u.trim())
      .filter(u => u.startsWith("http://") || u.startsWith("https://"));

    if (urls.length === 0) {
      toast.error("অনুগ্রহ করে অন্তত একটি সঠিক URL প্রদান করুন (http:// বা https:// দিয়ে শুরু)");
      return;
    }

    setIsFetchingBatch(true);
    setScrapedProducts([]);
    
    // Initialize progress list
    const initialProgress = urls.map(url => ({ url, status: "pending" as const }));
    setProgressList(initialProgress);

    const scrapePromises = urls.map(async (url, idx) => {
      // Update state to scraping
      setProgressList(prev => prev.map((item, i) => i === idx ? { ...item, status: "scraping" } : item));

      try {
        const { data, error } = await supabase.functions.invoke("product-scraper", { body: { url } });
        
        let responseData = data;
        if (typeof data === 'string') {
          try { responseData = JSON.parse(data); } catch(e) {}
        }

        const products = responseData?.products;
        if (!products || !Array.isArray(products) || products.length === 0) {
          throw new Error("এই লিঙ্ক থেকে কোনো প্রোডাক্টের ডাটা পাওয়া যায়নি");
        }

        const newProducts: ScrapedProduct[] = products.map((extracted: any, subIdx: number) => {
          const regularPrice = extracted.price ? extracted.price.toString() : "0";
          const discountPct = extracted.discount_percentage ? extracted.discount_percentage.toString() : "0";
          let cashPrice = "";
          
          if (Number(regularPrice) > 0 && Number(discountPct) > 0) {
            cashPrice = Math.round(Number(regularPrice) * (1 - Number(discountPct) / 100)).toString();
          }

          let productImages: string[] = [];
          if (Array.isArray(extracted.images) && extracted.images.length > 0) {
            productImages = extracted.images.filter((img: any) => typeof img === 'string' && img.trim() !== "");
          }
          if (extracted.image_url && !productImages.includes(extracted.image_url)) {
            productImages.unshift(extracted.image_url);
          }

          return {
            id: `scraped_${Date.now()}_${idx}_${subIdx}_${Math.random().toString(36).substring(2, 9)}`,
            name: extracted.name || "অজ্ঞাত প্রোডাক্ট",
            category: CATEGORIES.includes(extracted.category) ? extracted.category : "CCTV",
            brand: BRANDS.includes(extracted.brand) ? extracted.brand : "Other",
            description: extracted.description || "",
            price: regularPrice,
            cash_discount_price: cashPrice,
            discount_percentage: discountPct,
            image_url: extracted.image_url || (productImages.length > 0 ? productImages[0] : ""),
            images: productImages,
            show_in_store: true,
            call_for_price: false,
            sku: "",
            stock_quantity: "10",
            sourceUrl: url,
          };
        });

        setScrapedProducts(prev => [...prev, ...newProducts]);
        setProgressList(prev => prev.map((item, i) => i === idx ? { 
          ...item, 
          status: "success", 
          productName: `${newProducts.length} টি প্রোডাক্ট পাওয়া গেছে` 
        } : item));

      } catch (err: any) {
        console.error(`Scrape failed for ${url}:`, err);
        setProgressList(prev => prev.map((item, i) => i === idx ? { 
          ...item, 
          status: "failed", 
          error: err.message || "সংযোগে ত্রুটি ঘটেছে" 
        } : item));
      }
    });

    await Promise.all(scrapePromises);
    setIsFetchingBatch(false);
    toast.success("প্রোডাক্ট ডেটা সংগ্রহের কাজ সম্পন্ন হয়েছে!");
  };

  const handleCardPriceChange = (id: string, field: "price" | "cash_discount_price", val: string) => {
    setScrapedProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: val };
      
      const regular = Number(field === "price" ? val : p.price) || 0;
      const cash = Number(field === "cash_discount_price" ? val : p.cash_discount_price) || 0;
      
      if (regular > 0 && cash > 0 && cash < regular) {
        updated.discount_percentage = (((regular - cash) / regular) * 100).toFixed(1);
      } else {
        updated.discount_percentage = "0";
      }
      return updated;
    }));
  };

  const handleCardPercentageChange = (id: string, val: string) => {
    setScrapedProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const pct = Number(val) || 0;
      const regular = Number(p.price) || 0;
      const updated = { ...p, discount_percentage: val };
      
      if (regular > 0 && pct > 0 && pct < 100) {
        updated.cash_discount_price = Math.round(regular * (1 - pct / 100)).toString();
      }
      return updated;
    }));
  };

  const handleCardFieldChange = (id: string, field: keyof ScrapedProduct, val: any) => {
    setScrapedProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const removeScrapedProduct = (id: string) => {
    setScrapedProducts(prev => prev.filter(p => p.id !== id));
    toast.info("প্রোডাক্টটি তালিকা থেকে বাদ দেওয়া হয়েছে");
  };

  const applyBulkCategory = (cat: string) => {
    if (!cat) return;
    setBulkCategory(cat);
    setScrapedProducts(prev => prev.map(p => ({ ...p, category: cat })));
    toast.success(`সব প্রোডাক্টের ক্যাটাগরি "${cat}" এ সেট করা হয়েছে!`);
  };

  const applyBulkBrand = (brand: string) => {
    if (!brand) return;
    setBulkBrand(brand);
    setScrapedProducts(prev => prev.map(p => ({ ...p, brand: brand })));
    toast.success(`সব প্রোডাক্টের ব্র্যান্ড "${brand}" এ সেট করা হয়েছে!`);
  };

  const handleBulkSubmit = async () => {
    if (scrapedProducts.length === 0) {
      toast.error("কোনো প্রোডাক্ট ইম্পোর্ট করার জন্য পাওয়া যায়নি");
      return;
    }

    setBulkLoading(true);
    try {
      // 1. Prepare products payload
      const productsPayload = scrapedProducts.map(p => ({
        name: p.name.trim(),
        category: p.category,
        brand: p.brand,
        description: p.description.trim() || null,
        sku: p.sku.trim() || null,
        price: Number(p.price) || 0,
        stock_quantity: Number(p.stock_quantity) || 0,
        cash_discount_price: p.cash_discount_price ? Number(p.cash_discount_price) : null,
        discount_percentage: Number(p.discount_percentage) || 0,
        show_in_store: p.show_in_store,
        call_for_price: p.call_for_price || false,
        image_url: p.image_url || null,
      }));

      // 2. Bulk insert products
      const { data: insertedProducts, error: insertError } = await supabase
        .from("products")
        .insert(productsPayload)
        .select();

      if (insertError) throw insertError;

      // 3. Insert images into product_images table in bulk
      if (insertedProducts && insertedProducts.length > 0) {
        const imageInserts: any[] = [];
        insertedProducts.forEach((prod, idx) => {
          const originalProduct = scrapedProducts[idx];
          if (originalProduct) {
            const uniqImages = new Set<string>();
            if (originalProduct.image_url) {
              uniqImages.add(originalProduct.image_url);
            }
            if (Array.isArray(originalProduct.images)) {
              originalProduct.images.forEach(img => {
                if (img && typeof img === 'string') uniqImages.add(img);
              });
            }
            
            Array.from(uniqImages).forEach((imgUrl, imgIdx) => {
              imageInserts.push({
                product_id: prod.id,
                image_url: imgUrl,
                sort_order: imgIdx,
              });
            });
          }
        });

        if (imageInserts.length > 0) {
          const { error: imgError } = await supabase.from("product_images").insert(imageInserts);
          if (imgError) console.error("Bulk image insert error:", imgError);
        }
      }

      toast.success(`${scrapedProducts.length} টি প্রোডাক্ট সফলভাবে স্টোরে যোগ করা হয়েছে!`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/products");
    } catch (err: any) {
      console.error("Bulk insert error:", err);
      toast.error(`ইম্পোর্ট ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Single Manual Form Code
  // ---------------------------------------------------------
  const handleManualPriceChange = (field: "price" | "cash_discount_price", value: string) => {
    const newForm = { ...manualForm, [field]: value };
    const regular = Number(field === "price" ? value : manualForm.price) || 0;
    const cash = Number(field === "cash_discount_price" ? value : manualForm.cash_discount_price) || 0;
    
    if (regular > 0 && cash > 0 && cash < regular) {
      newForm.discount_percentage = (((regular - cash) / regular) * 100).toFixed(1);
    } else {
      newForm.discount_percentage = "0";
    }
    setManualForm(newForm);
  };

  const handleManualPercentageChange = (value: string) => {
    const pct = Number(value) || 0;
    const regular = Number(manualForm.price) || 0;
    const newForm = { ...manualForm, discount_percentage: value };
    if (regular > 0 && pct > 0 && pct < 100) {
      newForm.cash_discount_price = Math.round(regular * (1 - pct / 100)).toString();
    }
    setManualForm(newForm);
  };

  const handleManualImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setManualImageFile(file);
      setManualImagePreview(URL.createObjectURL(file));
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.price) {
      toast.error("প্রোডাক্টের নাম এবং রেগুলার মূল্য দিতে হবে");
      return;
    }

    setManualLoading(true);
    try {
      const payload = {
        name: manualForm.name.trim(),
        category: manualForm.category,
        brand: manualForm.brand,
        description: manualForm.description.trim() || null,
        sku: manualForm.sku.trim() || null,
        price: Number(manualForm.price) || 0,
        stock_quantity: Number(manualForm.stock_quantity) || 0,
        cash_discount_price: manualForm.cash_discount_price ? Number(manualForm.cash_discount_price) : null,
        discount_percentage: Number(manualForm.discount_percentage) || 0,
        show_in_store: manualForm.show_in_store,
        call_for_price: manualForm.call_for_price || false,
      };

      const { data: inserted, error } = await supabase.from("products").insert(payload).select().single();
      if (error) throw error;

      let finalImageUrl = null;

      if (manualImageFile && inserted) {
        const ext = manualImageFile.name.split('.').pop();
        const filePath = `${inserted.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, manualImageFile, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
          finalImageUrl = data?.publicUrl;
        }
      } else if (!manualImageFile && manualImagePreview) {
        finalImageUrl = manualImagePreview;
      }

      if (finalImageUrl) {
        await supabase.from("products").update({ image_url: finalImageUrl } as any).eq("id", inserted.id);
        await supabase.from("product_images").insert({ product_id: inserted.id, image_url: finalImageUrl, sort_order: 0 });
      }

      toast.success("প্রোডাক্ট সফলভাবে স্টোরে যুক্ত করা হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/products");
    } catch (err: any) {
      console.error("Error adding product manually:", err);
      toast.error(`ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      setManualLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6 pb-24">
      {/* Header Banner - premium gradient glow */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-8 text-primary-foreground shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_120%,rgba(255,255,255,0.1),transparent_80%)]" />
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/5 blur-2xl" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/products")} 
                className="text-white hover:bg-white/10 rounded-full h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="text-xs uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md">
                AK IT Solution Store Manager
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <PackagePlus className="h-10 w-10 text-yellow-300 drop-shadow" /> নতুন প্রোডাক্ট খুঁজুন ও যুক্ত করুন
            </h1>
            <p className="text-white/80 text-sm sm:text-base max-w-2xl font-light">
              খুচরা বা পাইকারি বিক্রেতাদের ওয়েবসাইট লিঙ্ক দিয়ে এক ক্লিকে সম্পূর্ণ ব্যাচ প্রোডাক্ট ডাটা সরাসরি নিয়ে আসুন, প্রাইজ কাস্টমাইজ করুন এবং স্টোরে পাবলিশ করুন।
            </p>
          </div>
          <div className="shrink-0 hidden lg:block">
            <Sparkles className="h-28 w-28 text-white/10 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Tabs Switcher - premium styled glass tab buttons */}
      <div className="flex bg-muted/65 p-1.5 rounded-2xl max-w-md mx-auto border border-border/40 backdrop-blur-xl">
        <button
          onClick={() => setActiveTab("batch")}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === "batch"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" /> ব্যাচ লিঙ্ক ইম্পোর্ট
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === "manual"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plus className="h-4 w-4" /> ম্যানুয়াল প্রোডাক্ট এন্ট্রি
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Active Tab Content: Batch Scraper */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "batch" && (
        <div className="space-y-6">
          {/* Paste URL Box */}
          <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-b from-card to-background rounded-3xl overflow-hidden backdrop-blur-xl">
            <CardHeader className="bg-primary/5 border-b border-primary/10 px-6 py-5">
              <CardTitle className="text-xl flex items-center gap-2 text-primary font-extrabold">
                <LinkIcon className="h-5 w-5 text-indigo-500" /> একসাথে একাধিক প্রোডাক্টের লিঙ্ক দিন (Batch Link Import)
              </CardTitle>
              <CardDescription className="text-sm font-medium">
                Ryans, Startech, TechLand ইত্যাদির যেকোনো ক্যাটাগরি বা প্রোডাক্ট পেজের পূর্ণাঙ্গ লিঙ্ক দিন। প্রতি লাইনে একটি করে লিঙ্ক লিখুন।
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={batchUrlsText}
                  onChange={(e) => setBatchUrlsText(e.target.value)}
                  placeholder="https://www.startech.com.bd/dahua-hac-hfw1200tp-camera&#10;https://www.ryanscomputers.com/dahua-hac-b1a21-camera"
                  rows={4}
                  className="text-base rounded-2xl bg-muted/20 border-primary/25 focus-visible:ring-primary h-36 font-mono p-4 resize-none transition-all shadow-inner focus:bg-background"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-xs text-muted-foreground font-medium bg-muted px-3 py-1.5 rounded-lg flex items-center gap-1">
                  💡 পরামর্শ: একের অধিক লিঙ্ক দিতে কিবোর্ডের Enter চেপে নতুন লাইনে লিখুন।
                </span>
                <Button 
                  onClick={handleBatchScrape} 
                  disabled={isFetchingBatch || !batchUrlsText.trim()} 
                  className="h-13 px-8 rounded-xl text-base font-bold shadow-lg shadow-indigo-500/20 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
                >
                  {isFetchingBatch ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" /> ডেটা আনা হচ্ছে…
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-5 w-5 mr-2 animate-bounce" /> প্রোডাক্ট ডেটা নিয়ে আসুন
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Loading Status Panel */}
          {progressList.length > 0 && (
            <Card className="border border-border/50 shadow-md rounded-2xl overflow-hidden bg-card/60 backdrop-blur-xl">
              <CardHeader className="bg-muted/40 px-6 py-4 border-b border-border/30">
                <CardTitle className="text-sm font-extrabold text-muted-foreground flex items-center gap-2">
                  🔄 স্ক্র্যাপিং স্ট্যাটাস (Scraping Status)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 max-h-56 overflow-y-auto">
                {progressList.map((prog, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border/40 bg-background/50 hover:bg-background transition-colors gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="shrink-0 h-8 w-8 rounded-lg bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground block truncate font-mono">{prog.url}</span>
                        {prog.productName && (
                          <span className="text-xs font-bold text-foreground mt-0.5 block truncate flex items-center gap-1.5">
                            ✨ {prog.productName}
                          </span>
                        )}
                        {prog.error && (
                          <span className="text-xs font-bold text-destructive mt-0.5 block truncate">
                            ⚠️ {prog.error}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 self-end sm:self-center">
                      {prog.status === "pending" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">বাকি আছে</span>
                      )}
                      {prog.status === "scraping" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 animate-pulse flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> আনা হচ্ছে
                        </span>
                      )}
                      {prog.status === "success" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> সম্পন্ন
                        </span>
                      )}
                      {prog.status === "failed" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> ব্যর্থ
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Scraped Products List / Interactive Grid */}
          {scrapedProducts.length > 0 && (
            <div className="space-y-6">
              {/* Bulk Assignments Card */}
              <Card className="border border-border shadow-md bg-gradient-to-r from-card to-muted/40 rounded-2xl overflow-hidden">
                <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-lg text-primary flex items-center gap-1.5">
                      🪄 অল-ইন-ওয়ান অ্যাসাইনমেন্ট (Bulk Settings)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      নিচের সবকটি প্রোডাক্টের ব্র্যান্ড বা ক্যাটাগরি এক সাথে সেট করতে এই শর্টকাটটি ব্যবহার করুন।
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="space-y-1 w-full sm:w-44">
                      <Label className="text-[11px] font-bold">একসাথে ক্যাটাগরি সেট</Label>
                      <Select value={bulkCategory} onValueChange={applyBulkCategory}>
                        <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="ক্যাটাগরি সিলেক্ট" /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 w-full sm:w-44">
                      <Label className="text-[11px] font-bold">একসাথে ব্র্যান্ড সেট</Label>
                      <Select value={bulkBrand} onValueChange={applyBulkBrand}>
                        <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="ব্র্যান্ড সিলেক্ট" /></SelectTrigger>
                        <SelectContent>
                          {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scraped Product Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scrapedProducts.map((p) => (
                  <Card key={p.id} className="relative border-2 border-border hover:border-primary/30 transition-all shadow-lg rounded-3xl overflow-hidden bg-card flex flex-col group">
                    {/* Discard Card Button on top right */}
                    <button 
                      onClick={() => removeScrapedProduct(p.id)}
                      className="absolute top-3 right-3 z-20 p-2 bg-background/80 hover:bg-red-500 hover:text-white rounded-full transition-all border border-border shadow-sm active:scale-90"
                      title="বাতিল করুন"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {/* Image and basic fields */}
                    <div className="p-5 border-b border-border/50 bg-muted/15 flex flex-col gap-3">
                      <div className="flex items-start gap-4 w-full">
                        <div className="relative shrink-0 w-24 h-24 aspect-square rounded-2xl border bg-white overflow-hidden shadow-inner flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                          {p.image_url ? (
                            <img src={p.image_url} alt="Product" className="h-full w-full object-contain p-1" />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
                          )}
                          
                          {/* Source link badge */}
                          <a 
                            href={p.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="absolute bottom-1 right-1 p-1 bg-primary text-white rounded-md hover:scale-110 active:scale-95 transition-all shadow"
                            title="লিঙ্কে যান"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        <div className="flex-1 space-y-2.5 min-w-0">
                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-muted-foreground">প্রোডাক্টের নাম *</Label>
                            <Input
                              value={p.name}
                              onChange={(e) => handleCardFieldChange(p.id, "name", e.target.value)}
                              placeholder="Product Name"
                              className="h-10 text-sm rounded-xl font-bold bg-background shadow-sm"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Display multiple scraped image thumbnails if available */}
                      {p.images && p.images.length > 1 && (
                        <div className="flex gap-1.5 py-1 overflow-x-auto max-w-full scrollbar-thin">
                          {p.images.map((imgUrl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleCardFieldChange(p.id, "image_url", imgUrl)}
                              className={`relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                                p.image_url === imgUrl ? "border-primary shadow-sm" : "border-border/60 hover:border-muted-foreground"
                              }`}
                            >
                              <img src={imgUrl} alt="" className="h-full w-full object-contain bg-white" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Editor Form for single card */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-muted-foreground">ক্যাটাগরি</Label>
                          <Select value={p.category} onValueChange={(v) => handleCardFieldChange(p.id, "category", v)}>
                            <SelectTrigger className="h-10 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-muted-foreground">ব্র্যান্ড</Label>
                          <Select value={p.brand} onValueChange={(v) => handleCardFieldChange(p.id, "brand", v)}>
                            <SelectTrigger className="h-10 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {BRANDS.map(brand => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Pricing Block */}
                      <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-3.5">
                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-primary">রেগুলার মূল্য (৳) *</Label>
                            <Input
                              type="number"
                              value={p.price}
                              onChange={(e) => handleCardPriceChange(p.id, "price", e.target.value)}
                              className="h-11 font-bold text-base rounded-xl border-primary/20 bg-background"
                              placeholder="0"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-muted-foreground">ক্যাশ মূল্য (৳)</Label>
                            <Input
                              type="number"
                              value={p.cash_discount_price}
                              onChange={(e) => handleCardPriceChange(p.id, "cash_discount_price", e.target.value)}
                              className="h-11 font-bold text-base rounded-xl bg-background"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5 items-end">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-muted-foreground">ডিসকাউন্ট (%)</Label>
                            <Input
                              type="number"
                              step="0.1" min="0" max="99"
                              value={p.discount_percentage}
                              onChange={(e) => handleCardPercentageChange(p.id, e.target.value)}
                              className="h-9 rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-muted-foreground">স্টক পরিমাণ</Label>
                            <Input
                              type="number"
                              value={p.stock_quantity}
                              onChange={(e) => handleCardFieldChange(p.id, "stock_quantity", e.target.value)}
                              className="h-9 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Collapsible/Sleek Description */}
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground">বিবরণ (Description)</Label>
                        <Textarea
                          value={p.description}
                          onChange={(e) => handleCardFieldChange(p.id, "description", e.target.value)}
                          placeholder="প্রোডাক্টের বিবরণ..."
                          rows={3}
                          className="text-xs rounded-xl bg-background resize-none"
                        />
                      </div>

                      {/* Publish / Store Show Control */}
                      <div className="pt-2 mt-auto border-t border-border/40 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            {p.show_in_store ? <Eye className="h-4 w-4 text-emerald-500 animate-pulse" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                            অনলাইন স্টোরে দেখান
                          </span>
                          <Switch 
                            checked={p.show_in_store} 
                            onCheckedChange={(val) => handleCardFieldChange(p.id, "show_in_store", val)} 
                            className="scale-95"
                          />
                        </div>

                        <div className="flex items-center justify-between border-t border-border/20 pt-2">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <Phone className="h-4 w-4 text-amber-500" />
                            Call for Price (মূল্য হাইড)
                          </span>
                          <Switch 
                            checked={p.call_for_price || false} 
                            onCheckedChange={(val) => handleCardFieldChange(p.id, "call_for_price", val)} 
                            className="scale-95"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Floating Save Toolbar at the bottom once products are ready */}
              <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 animate-in slide-in-from-bottom-5 duration-300">
                <Card className="border-2 border-indigo-500/30 bg-background/95 shadow-[0_15px_45px_rgba(99,102,241,0.2)] rounded-3xl overflow-hidden backdrop-blur-md">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block">ইম্পোর্ট সেন্টার</span>
                      <span className="text-sm font-extrabold text-foreground">{scrapedProducts.length} টি প্রোডাক্ট রেডি</span>
                    </div>
                    <Button 
                      onClick={handleBulkSubmit}
                      disabled={bulkLoading}
                      className="h-12 px-6 rounded-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-2"
                    >
                      {bulkLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Save className="h-5 w-5" />
                      )}
                      স্টোরে যোগ করুন
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Active Tab Content: Single Product Manual Entry */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "manual" && (
        <form onSubmit={handleManualSubmit} className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/50 px-6 py-5">
                  <CardTitle className="text-lg font-bold">প্রাথমিক তথ্য (Basic Info)</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">প্রোডাক্টের নাম (Product Name) <span className="text-destructive">*</span></Label>
                    <Input
                      value={manualForm.name}
                      onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                      placeholder="যেমন: Dahua 2MP Full Color Bullet Camera..."
                      className="h-12 text-base rounded-xl bg-muted/20"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">ক্যাটাগরি (Category)</Label>
                      <Select value={manualForm.category} onValueChange={(v) => setManualForm({ ...manualForm, category: v })}>
                        <SelectTrigger className="h-12 rounded-xl bg-muted/20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">ব্র্যান্ড (Brand)</Label>
                      <Select value={manualForm.brand} onValueChange={(v) => setManualForm({ ...manualForm, brand: v })}>
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
                      value={manualForm.description}
                      onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                      placeholder="প্রোডাক্টের ফিচার এবং বিস্তারিত তথ্য লিখুন..."
                      rows={6}
                      className="rounded-xl bg-muted/20 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/50 px-6 py-5">
                  <CardTitle className="text-lg flex items-center gap-2 font-bold">
                    <Percent className="h-5 w-5 text-primary" /> মূল্য এবং স্টক (Pricing & Inventory)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">রেগুলার মূল্য (Regular Price) ৳ <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        value={manualForm.price}
                        onChange={(e) => handleManualPriceChange("price", e.target.value)}
                        className="h-14 text-xl font-bold rounded-xl border-primary/30 focus-visible:ring-primary/20 bg-primary/5"
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">ছাড় মূল্য (Cash Discount Price) ৳</Label>
                      <Input
                        type="number"
                        value={manualForm.cash_discount_price}
                        onChange={(e) => handleManualPriceChange("cash_discount_price", e.target.value)}
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
                        value={manualForm.discount_percentage}
                        onChange={(e) => handleManualPercentageChange(e.target.value)}
                        className="h-12 rounded-xl bg-muted/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">স্টক পরিমাণ (Stock)</Label>
                      <Input
                        type="number"
                        value={manualForm.stock_quantity}
                        onChange={(e) => setManualForm({ ...manualForm, stock_quantity: e.target.value })}
                        className="h-12 rounded-xl bg-muted/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">SKU / বারকোড</Label>
                      <Input
                        value={manualForm.sku}
                        onChange={(e) => setManualForm({ ...manualForm, sku: e.target.value })}
                        placeholder="Optional SKU..."
                        className="h-12 rounded-xl bg-muted/20"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/50 px-6 py-5">
                  <CardTitle className="text-lg font-bold">প্রোডাক্টের ছবি (Image)</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center overflow-hidden relative group hover:border-primary/50 transition-colors">
                      {manualImagePreview ? (
                        <>
                          <img src={manualImagePreview} alt="Preview" className="h-full w-full object-contain bg-white p-2" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                            <Label htmlFor="manual-product-image" className="cursor-pointer bg-white text-black px-6 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform">
                              <Upload className="h-4 w-4" /> ছবি পরিবর্তন করুন
                            </Label>
                          </div>
                        </>
                      ) : (
                        <Label htmlFor="manual-product-image" className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary transition-colors p-6 text-center">
                          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <ImageIcon className="h-10 w-10 text-primary" />
                          </div>
                          <span className="font-bold text-base text-foreground">ক্লিক করে ছবি আপলোড করুন</span>
                          <span className="text-xs mt-2 opacity-70">JPG, PNG up to 5MB</span>
                        </Label>
                      )}
                      <input id="manual-product-image" type="file" accept="image/*" className="hidden" onChange={handleManualImageSelect} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        {manualForm.show_in_store ? <Eye className="h-6 w-6 text-primary" /> : <EyeOff className="h-6 w-6 text-muted-foreground" />}
                      </div>
                      <div>
                        <Label className="text-base font-bold block mb-1">স্টোরে দেখান (Publish)</Label>
                        <p className="text-xs text-muted-foreground">অনলাইন স্টোরে প্রোডাক্টটি দৃশ্যমান হবে</p>
                      </div>
                    </div>
                    <Switch checked={manualForm.show_in_store} onCheckedChange={(v) => setManualForm({ ...manualForm, show_in_store: v })} className="scale-110" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="p-3 bg-amber-500/10 rounded-xl">
                        <Phone className="h-6 w-6 text-amber-500" />
                      </div>
                      <div>
                        <Label className="text-base font-bold block mb-1">Call for Price (মূল্য হাইড)</Label>
                        <p className="text-xs text-muted-foreground">মূল্য গোপন রেখে সাইটে 'Call for Price' প্রদর্শন করুন</p>
                      </div>
                    </div>
                    <Switch checked={manualForm.call_for_price || false} onCheckedChange={(v) => setManualForm({ ...manualForm, call_for_price: v })} className="scale-110" />
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" disabled={manualLoading} className="w-full h-16 text-lg font-bold shadow-xl shadow-primary/25 rounded-3xl transition-all hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-blue-600 to-indigo-600">
                {manualLoading ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : <Save className="h-6 w-6 mr-2" />}
                প্রোডাক্ট সেভ করুন
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
