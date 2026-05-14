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
  Sparkles, Link2, Layers, Zap, ScanLine, RefreshCw, Plus, X, ChevronLeft, ChevronRight,
  ShoppingCart, ExternalLink
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";

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

  const queryClient = useQueryClient();

  const handleScan = async () => {
    const urls = mode === "bulk" ? bulkUrls.split("\n").map(u => u.trim()).filter(u => u.length > 0) : mode === "single" ? [url.trim()] : [];
    if (mode === "keyword" && !keyword.trim()) { toast.error("কীওয়ার্ড লিখুন"); return; }
    if (mode !== "keyword" && urls.length === 0) { toast.error("URL দিন"); return; }

    setLoading(true);
    setProducts([]);
    setProgress(5);
    setStatusText("শুরু হচ্ছে...");

    try {
      let allFound: ExtractedProduct[] = [];

      if (mode === "keyword") {
        setStatusText(`"${keyword}" দিয়ে খোঁজা হচ্ছে...`);
        setProgress(20);
        
        const { data, error } = await supabase.functions.invoke("product-scraper", {
          body: { keyword: keyword.trim() }
        });

        if (error) throw error;
        if (data?.products) {
          allFound = data.products.map((p: any) => ({ 
            ...p, 
            selected: true, 
            image_urls: [p.image_url].filter(Boolean) 
          }));
        }
      } else {
        for (let i = 0; i < urls.length; i++) {
          setStatusText(`স্ক্যানিং ${i + 1}/${urls.length}...`);
          setProgress(Math.round(((i + 1) / urls.length) * 90));
          
          const { data, error } = await supabase.functions.invoke("product-scraper", {
            body: { url: urls[i] }
          });

          if (error) {
            console.error(`Error scanning ${urls[i]}:`, error);
            continue;
          }

          if (data?.products) {
            const extracted = data.products.map((p: any) => ({ 
              ...p, 
              selected: true, 
              image_url: p.image_url?.replace(/_\d+x\d+.*\.jpg$/, "").replace(/\.small\.jpg$/, ".jpg"),
              image_urls: [p.image_url].filter(Boolean)
            }));
            allFound = [...allFound, ...extracted];
          }
        }
      }

      setProducts(allFound);
      setStatusText(allFound.length > 0 ? `${allFound.length}টি প্রোডাক্ট পাওয়া গেছে` : "কোনো প্রোডাক্ট পাওয়া যায়নি");
      if (allFound.length > 0) toast.success("সফল হয়েছে!");
      else if (allFound.length === 0) toast.error("কোনো প্রোডাক্ট পাওয়া যায়নি");
    } catch (err: any) {
      console.error("Scan error:", err);
      toast.error(err.message || "সমস্যা হয়েছে, আবার চেষ্টা করুন");
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const handleImport = async () => {
    const selected = products.filter(p => p.selected);
    if (selected.length === 0) { toast.error("প্রোডাক্ট সিলেক্ট করুন"); return; }
    setImporting(true);
    try {
      for (const p of selected) {
        if (importAs === "product") {
          await supabase.from("products").insert({
            name: p.name, price: p.price, description: p.description, category: p.category,
            brand: p.brand, image_url: p.image_url, show_in_store: true,
            discount_percentage: p.discount_percentage, cash_discount_price: p.cash_discount_price
          });
        } else {
          await supabase.from("projects").insert({
            title: p.name, description: p.description, budget: p.price,
            status: "pending", show_in_store: true, image_url: p.image_url
          });
        }
      }
      toast.success("ইমপোর্ট সফল");
      setProducts([]);
      queryClient.invalidateQueries({ queryKey: ["store-products"] });
    } catch (e) {
      toast.error("ইমপোর্ট ব্যর্থ");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Sparkles className="text-primary" /> AI Product Finder</h1>
          <p className="text-muted-foreground">যেকোনো সাইট থেকে অটোমেটিক প্রোডাক্ট সংগ্রহ করুন</p>
        </div>
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          <Button variant={importAs === "product" ? "default" : "ghost"} size="sm" onClick={() => setImportAs("product")}>পণ্য</Button>
          <Button variant={importAs === "package" ? "default" : "ghost"} size="sm" onClick={() => setImportAs("package")}>প্যাকেজ</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs value={mode} onValueChange={(v: any) => setMode(v)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="single">একক লিঙ্ক</TabsTrigger>
              <TabsTrigger value="bulk">বাল্ক লিঙ্ক</TabsTrigger>
              <TabsTrigger value="keyword">কীওয়ার্ড সার্চ</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              {mode === "keyword" ? (
                <Input placeholder="প্রোডাক্টের নাম..." value={keyword} onChange={e => setKeyword(e.target.value)} />
              ) : mode === "single" ? (
                <Input placeholder="URL দিন..." value={url} onChange={e => setUrl(e.target.value)} />
              ) : (
                <Textarea placeholder="প্রতি লাইনে একটি URL..." value={bulkUrls} onChange={e => setBulkUrls(e.target.value)} />
              )}
              <Button onClick={handleScan} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <ScanLine className="mr-2" />} স্ক্যান
              </Button>
            </div>
          </Tabs>

          {loading && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs font-medium"><span>{statusText}</span><span>{progress}%</span></div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {products.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">ফলাফল ({products.length})</h2>
            <Button onClick={handleImport} disabled={importing} className="bg-green-600 hover:bg-green-700">
              {importing ? <Loader2 className="animate-spin mr-2" /> : <Download className="mr-2" />} ইমপোর্ট
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p, idx) => (
              <Card key={idx} className={!p.selected ? "opacity-50" : ""}>
                <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                  <Checkbox checked={p.selected} onCheckedChange={() => {
                    const next = [...products];
                    next[idx].selected = !next[idx].selected;
                    setProducts(next);
                  }} className="absolute top-2 left-2 z-10" />
                  {p.image_url ? <img src={p.image_url} className="object-contain w-full h-full p-2" /> : <ImageIcon className="text-muted-foreground" />}
                </div>
                <CardContent className="p-4 space-y-2">
                  <Input value={p.name} onChange={e => {
                    const next = [...products];
                    next[idx].name = e.target.value;
                    setProducts(next);
                  }} className="font-bold border-none p-0 h-auto focus-visible:ring-0" />
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">৳{p.price}</span>
                    <Select value={p.category} onValueChange={v => {
                      const next = [...products];
                      next[idx].category = v;
                      setProducts(next);
                    }}>
                      <SelectTrigger className="h-7 text-[10px] w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
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
