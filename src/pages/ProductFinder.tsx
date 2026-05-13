import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Download, Globe, Loader2, Package, ImageIcon, Filter,
  Sparkles, Link2, Layers, Zap, ScanLine, RefreshCw, Plus, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useQueryClient } from "@tanstack/react-query";
import { GoogleGenerativeAI } from "@google/generative-ai";

type ExtractedProduct = {
  name: string;
  price: number;
  discount_percentage: number;
  cash_discount_price: number | null;
  description?: string;
  category: string;
  brand: string;
  image_url?: string;
  image_urls: string[];
  original_price?: string;
  selected: boolean;
};

const CATEGORIES = ["CCTV", "DVR/NVR", "Monitor", "Laptop", "Computer", "Networking", "Accessories", "Printer", "Keyboard/Mouse", "Server", "Mobile", "Attendance Device", "Smart Home", "Audio/Video", "Storage", "Software", "Cable", "UPS/IPS", "Other"];

export default function ProductFinder() {
  const [url, setUrl] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [keyword, setKeyword] = useState("");
  const [mode, setMode] = useState<"single" | "bulk" | "keyword">("single");
  const [importAs, setImportAs] = useState<"product" | "package">("product");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [products, setProducts] = useState<ExtractedProduct[]>([]);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 999999]);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");

  const queryClient = useQueryClient();

  const handleScan = async () => {
    const urls = mode === "bulk" ? bulkUrls.split("\n").map((u) => u.trim()).filter((u) => u.length > 0) : mode === "single" ? [url.trim()] : [];
    
    if (mode === "keyword" && !keyword.trim()) { toast.error("কীওয়ার্ড লিখুন"); return; }
    if (mode !== "keyword" && (urls.length === 0 || !urls[0])) { toast.error("অন্তত একটি URL দিন"); return; }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      toast.error("Gemini API Key is not configured in .env file");
      return;
    }

    setLoading(true); 
    setProducts([]); 
    setProgress(10);
    
    let allProducts: ExtractedProduct[] = [];
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are a product data extractor. Given webpage content, extract ALL products found. For each product extract name, price (in BDT, convert if needed: 1 USD ≈ 120 BDT), discount_percentage, cash_discount_price, description, category, brand, image_url, original_price. Return ONLY valid JSON (no markdown) with this exact shape: { "products": [ { "name": "string", "price": number, "discount_percentage": number, "cash_discount_price": number | null, "description": "string", "category": "CCTV" | "Networking" | "Accessories" | "Computer" | "Printer" | "Software" | "Server" | "Storage" | "Smart Home" | "Audio/Video" | "Mobile" | "Other", "brand": "string", "image_url": "string", "original_price": "string" } ] }`,
    });

    try {
      if (mode === "keyword") {
        setStatusText(`"${keyword}" দিয়ে Google-এ খুঁজছে...`);
        setProgress(30);
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword + " buy price")}&tbm=shop`;
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(searchUrl)}`;
        
        try {
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error("Failed to fetch from proxy");
          let html = await res.text();
          html = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 30000);
          
          setStatusText(`AI ডেটা এক্সট্রাক্ট করছে...`);
          setProgress(60);
          
          const result = await model.generateContent(`Extract products from this webpage:\n\n${html}`);
          let content = result.response.text().replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
          let extracted = JSON.parse(content);
          
          const formatted = (extracted.products || []).map((p: any) => ({ ...p, selected: true, discount_percentage: p.discount_percentage ?? 0, cash_discount_price: p.cash_discount_price ?? null, image_urls: [p.image_url, ...(p.image_urls || [])].filter((u: string) => !!u).filter((u: string, i: number, a: string[]) => a.indexOf(u) === i) }));
          allProducts = formatted;
        } catch (e: any) {
          toast.error("সার্চ করতে সমস্যা হয়েছে: " + e.message);
        }
      } else {
        for (let i = 0; i < urls.length; i++) {
          let currentUrl = urls[i];
          if (!currentUrl.startsWith("http")) currentUrl = "https://" + currentUrl;
          
          setProgress(Math.round(((i) / urls.length) * 80) + 10);
          setStatusText(`স্ক্যানিং (${i + 1}/${urls.length}): ${currentUrl.slice(0, 50)}...`);
          
          try {
            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(currentUrl)}`;
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error("Failed to fetch URL via proxy");
            
            const html = await res.text();
            const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 30000);
            
            const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*/gi) || [];
            const imageUrls = imgMatches
              .map((tag: string) => { const match = tag.match(/src=["']([^"']+)["']/); return match ? match[1] : null; })
              .filter((u: string | null): u is string => !!u && (u.startsWith("http") || u.startsWith("//")))
              .map((u: string) => u.startsWith("//") ? `https:${u}` : u)
              .slice(0, 50);
              
            const pageContent = cleanHtml + "\n\n--- IMAGE URLs FOUND ON PAGE ---\n" + imageUrls.join("\n");
            
            setStatusText(`AI ডেটা এক্সট্রাক্ট করছে (${i + 1}/${urls.length})...`);
            
            const result = await model.generateContent(`Extract products from this webpage (URL: ${currentUrl}):\n\n${pageContent}`);
            let content = result.response.text().replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
            let extracted = JSON.parse(content);
            
            const formatted = (extracted.products || []).map((p: any) => ({ ...p, selected: true, discount_percentage: p.discount_percentage ?? 0, cash_discount_price: p.cash_discount_price ?? null, image_urls: [p.image_url, ...(p.image_urls || [])].filter((u: string) => !!u).filter((u: string, i: number, a: string[]) => a.indexOf(u) === i) }));
            allProducts = [...allProducts, ...formatted];
          } catch (e: any) {
            toast.error(`ব্যর্থ: ${currentUrl.slice(0, 40)}... (${e.message})`);
          }
        }
      }
      
      setProducts(allProducts); 
      setProgress(100);
      setStatusText(`মোট ${allProducts.length}টি প্রোডাক্ট পাওয়া গেছে`);
      allProducts.length === 0 ? toast.info("কোনো প্রোডাক্ট পাওয়া যায়নি") : toast.success(`${allProducts.length}টি প্রোডাক্ট পাওয়া গেছে!`);
    } catch (err: any) { 
      toast.error(err.message || "স্ক্যান করতে সমস্যা হয়েছে"); 
      setProgress(0); 
      setStatusText(""); 
    } finally { 
      setLoading(false); 
    }
  };

  const toggleProduct = (index: number) => setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p)));

  const updateProduct = (index: number, field: string, value: any) => {
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const handleImport = async () => {
    const selected = products.filter((p) => p.selected);
    if (selected.length === 0) { toast.error("কোনো আইটেম সিলেক্ট করুন"); return; }
    setImporting(true);
    let imported = 0;
    try {
      if (importAs === "package") {
        for (const product of selected) {
          setStatusText(`প্যাকেজ ইমপোর্ট: ${product.name} (${imported + 1}/${selected.length})`);
          setProgress(Math.round((imported / selected.length) * 100));
          const { error: insertError } = await supabase.from("projects").insert({
            title: product.name, description: product.description || "", budget: product.price,
            status: "pending", show_in_store: true, image_url: product.image_url || null,
          });
          if (insertError) { toast.error(`"${product.name}" প্যাকেজ ইমপোর্ট ব্যর্থ`); continue; }
          imported++;
        }
      } else {
        for (const product of selected) {
          setStatusText(`ইমপোর্ট হচ্ছে: ${product.name} (${imported + 1}/${selected.length})`);
          setProgress(Math.round((imported / selected.length) * 100));
          const firstImage = product.image_urls.length > 0 ? product.image_urls[0] : (product.image_url || null);
          const { data: insertedProduct, error: insertError } = await supabase.from("products").insert({
            name: product.name, price: product.price, description: product.description || "",
            category: product.category, brand: product.brand, stock_quantity: 0, show_in_store: true,
            discount_percentage: product.discount_percentage || 0, cash_discount_price: product.cash_discount_price || null,
            image_url: firstImage
          }).select("id").single();
          if (insertError) { toast.error(`"${product.name}" ইমপোর্ট করতে সমস্যা হয়েছে`); continue; }
          const imagesToProcess = product.image_urls.length > 0 ? product.image_urls : (product.image_url ? [product.image_url] : []);
          if (imagesToProcess.length > 0 && insertedProduct) {
            for (let imgIdx = 0; imgIdx < imagesToProcess.length; imgIdx++) {
              let finalImageUrl = imagesToProcess[imgIdx];
              try {
                const { data: imgData } = await supabase.functions.invoke("product-image-proxy", {
                  body: { image_url: imagesToProcess[imgIdx], product_id: insertedProduct.id },
                });
                if (imgData?.public_url) {
                  finalImageUrl = imgData.public_url;
                  if (imgIdx === 0) {
                    await supabase.from("products").update({ image_url: finalImageUrl }).eq("id", insertedProduct.id);
                  }
                }
              } catch (imgErr) { console.error("Image proxy error:", imgErr); }
              await supabase.from("product_images").insert({ product_id: insertedProduct.id, image_url: finalImageUrl, sort_order: imgIdx });
            }
          }
          imported++;
        }
      }
      setProgress(100);
      const label = importAs === "package" ? "প্যাকেজ" : "প্রোডাক্ট";
      setStatusText(`${imported}টি ${label} সফলভাবে ইমপোর্ট হয়েছে!`);
      toast.success(`${imported}টি ${label} ইমপোর্ট সম্পন্ন! Products পেজে দেখুন।`);
      setProducts([]);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch { toast.error("ইমপোর্ট করতে সমস্যা হয়েছে"); }
    finally { setImporting(false); }
  };

  const applyBulkCategory = (cat: string) => {
    setBulkCategory(cat);
    setProducts((prev) => prev.map((p) => (p.selected ? { ...p, category: cat } : p)));
    toast.success(`সিলেক্টেড আইটেমের ক্যাটাগরি "${cat}" করা হয়েছে`);
  };

  const selectedCount = products.filter((p) => p.selected).length;
  const maxPrice = products.length > 0 ? Math.max(...products.map((p) => p.price), 1) : 999999;
  const filteredProducts = products.filter((p) => {
    const catMatch = filterCategory === "all" || p.category === filterCategory;
    const priceMatch = p.price >= priceRange[0] && p.price <= priceRange[1];
    return catMatch && priceMatch;
  });
  const filteredSelectedCount = filteredProducts.filter((p) => p.selected).length;

  return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-accent p-6 md:p-8 text-primary-foreground">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="absolute top-4 right-4 opacity-10">
            <Globe className="h-32 w-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">AI Product Finder</h1>
                <p className="text-sm opacity-80 mt-0.5">বিশ্বের যেকোনো ওয়েবসাইট থেকে প্রোডাক্ট খুঁজে আনুন — সরাসরি Products-এ যুক্ত হবে</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {["Daraz", "AliExpress", "Amazon", "Alibaba", "Google Shopping", "যেকোনো সাইট"].map((site) => (
                <span key={site} className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur-sm border border-white/20">
                  {site}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Scanner Card */}
        <Card className="border-none shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-12 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="single" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">একটি URL</span>
                </TabsTrigger>
                <TabsTrigger value="bulk" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">একাধিক URL</span>
                </TabsTrigger>
                <TabsTrigger value="keyword" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">কীওয়ার্ড সার্চ</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="mt-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative group">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="যেকোনো ওয়েবসাইটের URL পেস্ট করুন..."
                      className="pl-11 h-12 text-base rounded-xl border-2 border-border/50 focus:border-primary/50 transition-all"
                      onKeyDown={(e) => e.key === "Enter" && !loading && handleScan()}
                      disabled={loading || importing}
                    />
                  </div>
                  <Button onClick={handleScan} disabled={loading || importing} size="lg" className="h-12 px-6 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25">
                    {loading ? (
                      <><Loader2 className="h-4.5 w-4.5 mr-2 animate-spin" />স্ক্যানিং...</>
                    ) : (
                      <><ScanLine className="h-4.5 w-4.5 mr-2" />স্ক্যান</>
                    )}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    { label: "daraz.com.bd", icon: "🛍️" },
                    { label: "aliexpress.com", icon: "🌐" },
                    { label: "amazon.com", icon: "📦" },
                    { label: "alibaba.com", icon: "🏭" },
                  ].map((site) => (
                    <button
                      key={site.label}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30 transition-all flex items-center gap-1.5"
                      onClick={() => setUrl(`https://www.${site.label}`)}
                    >
                      <span>{site.icon}</span>{site.label}
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="bulk" className="mt-4">
                <div className="space-y-3">
                  <Textarea
                    value={bulkUrls}
                    onChange={(e) => setBulkUrls(e.target.value)}
                    placeholder={"প্রতি লাইনে একটি URL দিন:\nhttps://daraz.com.bd/product/1\nhttps://aliexpress.com/item/2\nhttps://amazon.com/dp/3"}
                    rows={5}
                    disabled={loading || importing}
                    className="text-sm rounded-xl border-2 border-border/50 focus:border-primary/50"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {bulkUrls.split("\n").filter((u) => u.trim()).length}টি URL
                      </Badge>
                    </div>
                    <Button onClick={handleScan} disabled={loading || importing} className="rounded-xl bg-gradient-to-r from-primary to-accent">
                      {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />স্ক্যানিং...</> : <><ScanLine className="h-4 w-4 mr-2" />সব স্ক্যান করুন</>}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="keyword" className="mt-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="প্রোডাক্টের নাম লিখুন (e.g., Dahua 4MP IP Camera, TP-Link Router)"
                      className="pl-11 h-12 text-base rounded-xl border-2 border-border/50 focus:border-primary/50 transition-all"
                      onKeyDown={(e) => e.key === "Enter" && !loading && handleScan()}
                      disabled={loading || importing}
                    />
                  </div>
                  <Button onClick={handleScan} disabled={loading || importing} size="lg" className="h-12 px-6 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25">
                    {loading ? <><Loader2 className="h-4.5 w-4.5 mr-2 animate-spin" />খুঁজছে...</> : <><Search className="h-4.5 w-4.5 mr-2" />Google-এ খুঁজুন</>}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2.5 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  AI পুরো ইন্টারনেটে সার্চ করে প্রোডাক্ট, দাম ও ছবি খুঁজে আনবে
                </p>
              </TabsContent>
            </Tabs>

            {(loading || importing || statusText) && (
              <div className="mt-5 space-y-2.5 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{statusText}</span>
                  <span className="text-xs font-bold text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 rounded-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extracted Results */}
        {products.length > 0 && (
          <Card className="border-none shadow-lg bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-3 space-y-3 bg-gradient-to-r from-success/5 to-transparent">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-lg flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-success/10">
                    <Download className="h-4.5 w-4.5 text-success" />
                  </div>
                  পাওয়া প্রোডাক্ট
                  <Badge className="bg-success/10 text-success border-success/20">{filteredProducts.length}/{products.length}</Badge>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-0.5 border-2 border-border/50 rounded-lg p-0.5">
                    <Button variant={importAs === "product" ? "default" : "ghost"} size="sm" className="h-7 text-xs rounded-md" onClick={() => setImportAs("product")}>
                      <Package className="h-3 w-3 mr-1" />প্রোডাক্ট
                    </Button>
                    <Button variant={importAs === "package" ? "default" : "ghost"} size="sm" className="h-7 text-xs rounded-md" onClick={() => setImportAs("package")}>
                      <Layers className="h-3 w-3 mr-1" />প্যাকেজ
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="rounded-lg">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />ফিল্টার
                  </Button>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={filteredSelectedCount === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={(checked) => {
                        const filteredIndices = new Set(filteredProducts.map((_, i) => products.indexOf(filteredProducts[i])));
                        setProducts((prev) => prev.map((p, i) => filteredIndices.has(i) ? { ...p, selected: !!checked } : p));
                      }}
                    />
                    <span className="text-xs text-muted-foreground">সব</span>
                  </div>
                  <Button onClick={handleImport} disabled={importing || selectedCount === 0} className="rounded-lg bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/20">
                    {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />ইমপোর্ট...</> : <><Download className="h-4 w-4 mr-2" />{selectedCount}টি ইমপোর্ট</>}
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl border-2 border-border/50 bg-muted/20">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ক্যাটাগরি</label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-36 h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-primary uppercase tracking-wider">বাল্ক ক্যাটাগরি</label>
                    <Select value={bulkCategory} onValueChange={applyBulkCategory}>
                      <SelectTrigger className="w-44 h-8 text-xs border-primary/30 rounded-lg">
                        <SelectValue placeholder="সিলেক্টেডের ক্যাটাগরি" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 min-w-[200px] flex-1 max-w-xs">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      দাম: ৳{priceRange[0].toLocaleString()} — ৳{priceRange[1].toLocaleString()}
                    </label>
                    <Slider min={0} max={maxPrice} step={Math.max(1, Math.round(maxPrice / 100))} value={priceRange} onValueChange={(val) => setPriceRange(val as [number, number])} className="mt-2" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setFilterCategory("all"); setPriceRange([0, maxPrice]); }} className="rounded-lg">
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />রিসেট
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {filteredProducts.map((product) => {
                  const index = products.indexOf(product);
                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${
                        product.selected ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-muted/20 border-border/30 hover:border-border/60"
                      }`}
                    >
                      <Checkbox checked={product.selected} onCheckedChange={() => toggleProduct(index)} className="mt-1.5 border-2" />
                      {/* Image Gallery Thumbnails */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-muted to-muted/50 overflow-hidden ring-1 ring-border/30 flex items-center justify-center group">
                          {(product.image_urls.length > 0 ? product.image_urls[0] : product.image_url) ? (
                            <img src={product.image_urls[0] || product.image_url} alt={product.name} className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-muted-foreground/25" />
                          )}
                          {product.image_urls.length > 1 && (
                            <span className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow">
                              +{product.image_urls.length - 1}
                            </span>
                          )}
                        </div>
                        {/* Small thumbnails row */}
                        {product.image_urls.length > 1 && (
                          <div className="flex gap-1 w-20 overflow-x-auto">
                            {product.image_urls.slice(0, 4).map((imgUrl, imgIdx) => (
                              <div key={imgIdx} className="relative w-4 h-4 rounded-sm overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                                <img src={imgUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <Input value={product.name} onChange={(e) => updateProduct(index, "name", e.target.value)} className="font-medium h-8 text-sm rounded-lg" />
                        <div className="flex flex-wrap gap-2 items-center">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-primary">৳</span>
                            <Input type="number" value={product.price} onChange={(e) => updateProduct(index, "price", parseFloat(e.target.value) || 0)} className="w-28 h-7 text-xs rounded-lg" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">ছাড়%</span>
                            <Input type="number" value={product.discount_percentage} onChange={(e) => updateProduct(index, "discount_percentage", parseFloat(e.target.value) || 0)} className="w-16 h-7 text-xs rounded-lg" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">ক্যাশ৳</span>
                            <Input type="number" value={product.cash_discount_price ?? ""} onChange={(e) => updateProduct(index, "cash_discount_price", e.target.value ? parseFloat(e.target.value) : null)} className="w-24 h-7 text-xs rounded-lg" placeholder="ক্যাশ দাম" />
                          </div>
                          <Select value={product.category} onValueChange={(val) => updateProduct(index, "category", val)}>
                            <SelectTrigger className="w-32 h-7 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input value={product.brand} onChange={(e) => updateProduct(index, "brand", e.target.value)} className="w-28 h-7 text-xs rounded-lg" placeholder="ব্র্যান্ড" />
                          {product.original_price && (
                            <span className="text-[10px] text-muted-foreground line-through">মূল: {product.original_price}</span>
                          )}
                        </div>
                        {/* Image URLs management */}
                        <div className="space-y-1">
                          {product.image_urls.map((imgUrl, imgIdx) => (
                            <div key={imgIdx} className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 bg-muted">
                                <img src={imgUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              </div>
                              <Input
                                value={imgUrl}
                                onChange={(e) => {
                                  const newUrls = [...product.image_urls];
                                  newUrls[imgIdx] = e.target.value;
                                  updateProduct(index, "image_urls", newUrls);
                                }}
                                className="h-6 text-[10px] rounded flex-1"
                                placeholder="ছবির URL"
                              />
                              <button onClick={() => {
                                const newUrls = product.image_urls.filter((_, i) => i !== imgIdx);
                                updateProduct(index, "image_urls", newUrls);
                              }} className="text-destructive/60 hover:text-destructive p-0.5">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => updateProduct(index, "image_urls", [...product.image_urls, ""])}
                            className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium"
                          >
                            <Plus className="h-3 w-3" /> ছবি যোগ করুন
                          </button>
                        </div>
                        {product.description && <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <Card className="border-none shadow-lg bg-card/80 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto">
                  <Globe className="h-10 w-10 text-primary/50" />
                </div>
                <div className="absolute -top-1 -right-1 p-1 rounded-full bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
              </div>
              <h3 className="font-bold text-xl mb-2">বিশ্বের যেকোনো সাইট থেকে প্রোডাক্ট আনুন</h3>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Daraz, AliExpress, Amazon, Alibaba, Google Shopping — অথবা যেকোনো ওয়েবসাইটের URL দিন। 
                AI অটোমেটিক্যালি প্রোডাক্টের নাম, দাম, HD ছবি ও সম্পূর্ণ বিবরণ বের করে আনবে এবং সরাসরি Products পেজে যুক্ত হবে।
              </p>
              <div className="flex justify-center gap-3 mt-6">
                <Button variant="outline" className="rounded-xl" onClick={() => { setMode("keyword"); }}>
                  <Search className="h-4 w-4 mr-2" />কীওয়ার্ড দিয়ে খুঁজুন
                </Button>
                <Button className="rounded-xl bg-gradient-to-r from-primary to-accent" onClick={() => { setMode("single"); }}>
                  <Globe className="h-4 w-4 mr-2" />URL দিয়ে স্ক্যান
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
);
}
