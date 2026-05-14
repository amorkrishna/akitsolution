import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, Search, Plus, Trash2, Edit2, Globe, List, Package, 
  CheckCircle2, ArrowRight, ScanLine, ShoppingCart, Percent, 
  ExternalLink, Zap, Check, ChevronRight, LayoutGrid
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

type ExtractedProduct = {
  name: string;
  price: number;
  discount_percentage: number;
  description?: string;
  category: string;
  brand: string;
  image_url?: string;
  original_price?: string;
  selected: boolean;
};

const CATEGORIES = ["CCTV", "Networking", "Accessories", "Computer", "Printer", "Software", "Server", "Storage", "Smart Home", "Audio/Video", "Mobile", "Other"];

export default function ProductFinder() {
  const [url, setUrl] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [keyword, setKeyword] = useState("");
  const [mode, setMode] = useState<"single" | "bulk" | "keyword">("single");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [products, setProducts] = useState<ExtractedProduct[]>([]);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  const handleScan = async () => {
    const urls = mode === "bulk" ? bulkUrls.split("\n").filter(u => u.trim()) : mode === "single" ? [url.trim()] : [];
    
    if (mode === "keyword" && !keyword.trim()) { toast.error("কীওয়ার্ড লিখুন"); return; }
    if (mode !== "keyword" && urls.length === 0) { toast.error("URL দিন"); return; }

    setLoading(true);
    setProducts([]);
    setProgress(5);
    setStatusText("শুরু হচ্ছে...");

    try {
      let results: ExtractedProduct[] = [];

      if (mode === "keyword") {
        setStatusText("Google-এ খোঁজা হচ্ছে...");
        setProgress(30);
        const { data, error } = await supabase.functions.invoke("product-scraper", { body: { keyword } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        results = (data?.products || []).map((p: any) => ({ ...p, selected: true }));
      } else {
        for (let i = 0; i < urls.length; i++) {
          setStatusText(`স্ক্যানিং (${i+1}/${urls.length})...`);
          setProgress(Math.round(((i + 1) / urls.length) * 90));
          const { data, error } = await supabase.functions.invoke("product-scraper", { body: { url: urls[i] } });
          if (data?.products) {
            results = [...results, ...data.products.map((p: any) => ({ ...p, selected: true }))];
          }
        }
      }

      setProducts(results);
      setProgress(100);
      setStatusText(`${results.length}টি প্রোডাক্ট পাওয়া গেছে`);
      
      if (results.length === 0) {
        toast.info("কোনো প্রোডাক্ট পাওয়া যায়নি");
      } else {
        toast.success("সফল হয়েছে!");
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      toast.error(err.message || "সমস্যা হয়েছে");
      alert("Debug Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const selected = products.filter(p => p.selected);
    if (selected.length === 0) { toast.error("প্রোডাক্ট সিলেক্ট করুন"); return; }
    
    setImporting(true);
    try {
      for (const p of selected) {
        await supabase.from("projects").insert({
          title: p.name,
          description: p.description || "",
          budget: p.price,
          status: "pending",
          show_in_store: true,
          image_url: p.image_url || null,
        });
      }
      toast.success("সব ইমপোর্ট করা হয়েছে!");
      setProducts([]);
    } catch (err: any) {
      toast.error("ইমপোর্ট ব্যর্থ হয়েছে");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-accent p-6 md:p-8 text-primary-foreground shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Zap className="h-6 w-6 text-yellow-300 fill-yellow-300" />
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-md">AI Powered v2.0</Badge>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">AI Product Finder</h1>
            <p className="text-primary-foreground/80 text-lg max-w-2xl">বিশ্বের যেকোনো ওয়েবসাইট থেকে প্রোডাক্ট খুঁজে আনুন — সরাসরি Products-এ যুক্ত হবে</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Globe className="h-64 w-64 rotate-12" />
        </div>
      </div>

      <Card className="border-2 shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="single" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Globe className="h-4 w-4 mr-2" /> একটি URL
              </TabsTrigger>
              <TabsTrigger value="bulk" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <List className="h-4 w-4 mr-2" /> একাধিক URL
              </TabsTrigger>
              <TabsTrigger value="keyword" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Search className="h-4 w-4 mr-2" /> কীওয়ার্ড সার্চ
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 space-y-4">
              {mode === "single" && (
                <div className="flex gap-2">
                  <Input 
                    value={url} 
                    onChange={e => setUrl(e.target.value)} 
                    placeholder="প্রোডাক্টের লিঙ্ক দিন (যেমন: Ryans, StarTech...)" 
                    className="h-12 text-base rounded-xl"
                  />
                  <Button onClick={handleScan} disabled={loading} className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90">
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "স্ক্যান"}
                  </Button>
                </div>
              )}

              {mode === "bulk" && (
                <div className="space-y-3">
                  <Textarea 
                    value={bulkUrls} 
                    onChange={e => setBulkUrls(e.target.value)} 
                    placeholder="প্রতি লাইনে একটি করে URL দিন..." 
                    rows={5} 
                    className="rounded-xl"
                  />
                  <Button onClick={handleScan} disabled={loading} className="w-full h-12 rounded-xl">
                    {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <ScanLine className="h-4 w-4 mr-2" />} সব স্ক্যান করুন
                  </Button>
                </div>
              )}

              {mode === "keyword" && (
                <div className="flex gap-2">
                  <Input 
                    value={keyword} 
                    onChange={e => setKeyword(e.target.value)} 
                    placeholder="প্রোডাক্টের নাম লিখুন..." 
                    className="h-12 text-base rounded-xl"
                  />
                  <Button onClick={handleScan} disabled={loading} className="h-12 px-8 rounded-xl">
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "খুঁজুন"}
                  </Button>
                </div>
              )}
            </div>
          </Tabs>

          {loading && (
            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex justify-between text-sm font-medium">
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /> {statusText}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 rounded-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {products.length > 0 && (
        <div className="space-y-4 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> পাওয়া গেছে ({products.length})
            </h2>
            <Button onClick={handleImport} disabled={importing} className="bg-green-600 hover:bg-green-700 text-white rounded-xl">
              {importing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} 
              ইমপোর্ট করুন
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p, i) => (
              <Card key={i} className={`relative overflow-hidden border-2 transition-all ${p.selected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:border-primary/50'}`}>
                <div className="absolute top-2 right-2 z-10">
                  <input 
                    type="checkbox" 
                    checked={p.selected} 
                    onChange={() => setProducts(prev => prev.map((item, idx) => idx === i ? { ...item, selected: !item.selected } : item))}
                    className="h-5 w-5 rounded-full accent-primary"
                  />
                </div>
                {p.image_url && (
                  <div className="h-48 w-full overflow-hidden bg-white p-4">
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-contain mix-blend-multiply" />
                  </div>
                )}
                <CardContent className="p-4 space-y-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">{p.category}</Badge>
                  <h3 className="font-bold line-clamp-2 min-h-[3rem] text-sm leading-tight">{p.name}</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-xl font-black text-primary">৳{p.price.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
