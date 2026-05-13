import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Camera, CameraOff, ScanBarcode, Upload, ImageIcon, Eye, EyeOff, Percent, X, GripVertical, Layers, Search, Filter, CheckSquare, Wand2, Loader2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";

const categories = ["CCTV", "DVR/NVR", "Monitor", "Laptop", "Computer", "Networking", "Accessories", "Printer", "Keyboard/Mouse", "Server", "Mobile", "Attendance Device", "Smart Home", "Audio/Video", "Storage", "Software", "Other"];
const brands = ["Dahua", "Hikvision", "TP-Link", "Uniview", "ZKTeco", "Tenda", "Ruijie", "Other"];

export default function Products() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [form, setForm] = useState({
    name: "", category: "CCTV", brand: "Other", description: "", price: "", stock_quantity: "0", sku: "",
    cash_discount_price: "", discount_percentage: "0", show_in_store: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  // Multi-select
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkCategoryValue, setBulkCategoryValue] = useState("");
  const [savingBulkCategory, setSavingBulkCategory] = useState(false);
  // AI Image Edit
  const [aiEditingProductId, setAiEditingProductId] = useState<string | null>(null);
  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [showAiEdit, setShowAiEdit] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [aiSuggestions] = useState([
    { label: "Facebook পোস্টার", prompt: "Create a professional Facebook promotional poster for this product. Use a modern, dark premium aesthetic with glowing indigo/blue accents. Include bold Bengali text 'AK IT Solution - অবিশ্বাস্য মূল্যে প্রিমিয়াম প্রোডাক্ট!' and 'অর্ডার করতে ইনবক্স করুন।'. Add a stylish price tag badge and a sleek gradient background that highlights the product." },
    { label: "অনলাইন বুকিং ব্যানার", prompt: "Generate a professional online booking/order banner. Feature the product prominently with a high-end glow effect. Background should be a clean tech-inspired office or data center. Include text 'AK IT Solution - অনলাইন বুকিং চলছে' and a 'Book Now' call-to-action style element." },
    { label: "ইন্সটাগ্রাম পোস্ট", prompt: "Transform into a minimalist, square Instagram post. Center the product on a clean, professional studio background with soft realistic shadows. Use a premium color palette (slate, indigo, white). Include 'AK IT Solution' branding in a subtle, elegant font." },
    { label: "সেল পোস্টার", prompt: "Create a high-energy 'SALE' poster. Use vibrant colors like emerald green or electric yellow against a dark background. Include big 'বিরাট মূল্যহ্রাস!' text and a 'Limited Stock' urgency badge. Make the product look heroic with dynamic lighting." },
    { label: "ক্লিয়ার ব্যাকগ্রাউন্ড", prompt: "Remove the background and place the product on a pure white, professional studio background. Add a soft, realistic drop shadow and improve the product's overall lighting and contrast for a catalog-ready look." },
  ]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data || [] });

  const { data: variantCounts } = useQuery({
    queryKey: ["variant-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("product_variants").select("product_id");
      const counts: Record<string, number> = {};
      data?.forEach((v: any) => { counts[v.product_id] = (counts[v.product_id] || 0) + 1; });
      return counts;
    },
  });

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: products?.length || 0 };
    products?.forEach((p: any) => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products?.filter((p: any) => {
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
      const matchesSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }) || [];
  }, [products, selectedCategory, searchQuery]);

  const fetchProductImages = async (productId: string) => {
    const { data } = await supabase.from("product_images").select("*").eq("product_id", productId).order("sort_order");
    return data || [];
  };

  useEffect(() => {
    if (cameraOpen && open) {
      const timerId = setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode("dialog-barcode-reader");
          scannerRef.current = scanner;
          await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 100 } },
            (decodedText) => {
              setForm((f) => ({ ...f, sku: decodedText }));
              toast({ title: "Barcode scanned", description: `SKU: ${decodedText}` });
              setCameraOpen(false);
            },
            () => {}
          );
        } catch (err: any) {
          toast({ title: "Camera error", description: err?.message || "Could not access camera", variant: "destructive" });
          setCameraOpen(false);
        }
      }, 300);
      return () => clearTimeout(timerId);
    } else {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    }
  }, [cameraOpen, open]);

  useEffect(() => { if (!open) setCameraOpen(false); }, [open]);

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

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile) return null;
    const ext = imageFile.name.split('.').pop();
    const filePath = `${productId}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, imageFile, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const uploadAdditionalImages = async (productId: string) => {
    for (let i = 0; i < additionalImages.length; i++) {
      const file = additionalImages[i];
      const ext = file.name.split('.').pop();
      const filePath = `${productId}_${Date.now()}_${i}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(filePath, file, { upsert: true });
      if (error) continue;
      const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
      await supabase.from("product_images").insert({
        product_id: productId,
        image_url: data.publicUrl,
        sort_order: existingImages.length + i,
      });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      setUploading(true);
      const payload = {
        name: data.name, category: data.category, brand: data.brand, description: data.description, sku: data.sku,
        price: Number(data.price) || 0,
        stock_quantity: Number(data.stock_quantity) || 0,
        cash_discount_price: data.cash_discount_price ? Number(data.cash_discount_price) : null,
        discount_percentage: Number(data.discount_percentage) || 0,
        show_in_store: data.show_in_store,
      };
      let productId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from("products").insert(payload).select().single();
        if (error) throw error;
        productId = inserted.id;
      }
      if (imageFile && productId) {
        const imageUrl = await uploadImage(productId);
        if (imageUrl) {
          await supabase.from("products").update({ image_url: imageUrl } as any).eq("id", productId);
        }
      }
      if (additionalImages.length > 0 && productId) {
        await uploadAdditionalImages(productId);
      }
      if (productId) {
        for (const delId of deletedVariantIds) {
          await supabase.from("product_variants").delete().eq("id", delId);
        }
        for (const v of variants) {
          const variantPayload = {
            product_id: productId,
            variant_label: v.variant_label,
            variant_group: v.variant_group || "Size",
            price: Number(v.price) || 0,
            stock_quantity: Number(v.stock_quantity) || 0,
            sku: v.sku || null,
            sort_order: v.sort_order || 0,
          };
          if (v.id && !v.isNew) {
            await supabase.from("product_variants").update(variantPayload).eq("id", v.id);
          } else {
            await supabase.from("product_variants").insert(variantPayload);
          }
        }
      }
    },
    onSuccess: () => {
      setUploading(false);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["variant-counts"] });
      setOpen(false); setEditing(null); resetForm();
      toast({ title: editing ? "Product updated" : "Product added" });
    },
    onError: (err: any) => { setUploading(false); toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("products").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); toast({ title: "Product deleted" }); },
  });

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await supabase.from("product_variants").delete().eq("product_id", id);
        await supabase.from("product_images").delete().eq("product_id", id);
        await supabase.from("products").delete().eq("id", id);
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: `${ids.length}টি প্রোডাক্ট ডিলিট হয়েছে` });
      setSelectedIds(new Set());
      setIsMultiSelect(false);
    } catch {
      toast({ title: "ডিলিট ব্যর্থ", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkCategoryChange = async (newCategory: string) => {
    if (selectedIds.size === 0) return;
    setSavingBulkCategory(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("products").update({ category: newCategory }).in("id", ids);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: `${ids.length}টি প্রোডাক্টের ক্যাটাগরি "${newCategory}" করা হয়েছে` });
      setSelectedIds(new Set());
      setBulkCategoryValue("");
    } catch {
      toast({ title: "ক্যাটাগরি আপডেট ব্যর্থ", variant: "destructive" });
    } finally {
      setSavingBulkCategory(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredProducts.map((p: any) => p.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleAiEditImage = async (productId: string, prompt: string) => {
    const product = products?.find((p: any) => p.id === productId);
    if (!product?.image_url) {
      toast({ title: "এই প্রোডাক্টে কোনো ছবি নেই", variant: "destructive" });
      return;
    }

    setIsAiEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke("product-image-proxy", {
        body: {
          image_url: product.image_url,
          product_id: productId,
          ai_edit: true,
          ai_prompt: prompt,
        },
      });
      if (error) throw error;
      if (data?.public_url) {
        await supabase.from("products").update({ image_url: data.public_url } as any).eq("id", productId);
        await supabase.from("product_images").insert({ product_id: productId, image_url: data.public_url, sort_order: 99 });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast({ title: "ছবি AI দিয়ে এডিট হয়েছে!" });
      }
    } catch (err: any) {
      toast({ title: "AI এডিট ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setIsAiEditing(false);
      setShowAiEdit(false);
      setAiEditingProductId(null);
    }
  };

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, show }: { id: string; show: boolean }) => {
      const { error } = await supabase.from("products").update({ show_in_store: show } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); },
  });

  const deleteExistingImage = async (imageId: string) => {
    await supabase.from("product_images").delete().eq("id", imageId);
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const resetForm = () => {
    setForm({ name: "", category: "CCTV", brand: "Other", description: "", price: "", stock_quantity: "0", sku: "", cash_discount_price: "", discount_percentage: "0", show_in_store: true });
    setImageFile(null); setImagePreview(null);
    setAdditionalImages([]); setAdditionalPreviews([]); setExistingImages([]);
    setVariants([]); setDeletedVariantIds([]);
  };

  const openEdit = async (p: any) => {
    setEditing(p);
    setForm({
      name: p.name, category: p.category, brand: (p as any).brand || "Other", description: p.description || "",
      price: p.price.toString(), stock_quantity: p.stock_quantity.toString(), sku: p.sku || "",
      cash_discount_price: (p as any).cash_discount_price?.toString() || "",
      discount_percentage: (p as any).discount_percentage?.toString() || "0",
      show_in_store: (p as any).show_in_store !== false,
    });
    setImagePreview((p as any).image_url || null);
    setImageFile(null);
    setAdditionalImages([]); setAdditionalPreviews([]);
    const imgs = await fetchProductImages(p.id);
    setExistingImages(imgs);
    const { data: variantData } = await supabase.from("product_variants").select("*").eq("product_id", p.id).order("sort_order");
    setVariants(variantData || []);
    setDeletedVariantIds([]);
    setOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const handleAdditionalImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAdditionalImages(prev => [...prev, ...files]);
      setAdditionalPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    }
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
    setAdditionalPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const catColor: Record<string, string> = { CCTV: "bg-info/10 text-info", "Attendance Device": "bg-accent/10 text-accent", Networking: "bg-warning/10 text-warning", Server: "bg-primary/10 text-primary" };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground text-sm">
              {selectedCategory === "All" ? "All categories" : selectedCategory} — {filteredProducts.length} products
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Multi-select toggle */}
            <Button
              variant={isMultiSelect ? "default" : "outline"}
              size="sm"
              onClick={() => { setIsMultiSelect(!isMultiSelect); setSelectedIds(new Set()); }}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              {isMultiSelect ? "সিলেক্ট মোড ON" : "মাল্টি সিলেক্ট"}
            </Button>

            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); resetForm(); } }}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Product</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>

                {/* Main Product Image */}
                <div className="space-y-2 border-b border-border pb-4">
                  <Label>Main Image</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-image" className="cursor-pointer">
                        <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <Upload className="h-4 w-4" />
                          {imagePreview ? "Change image" : "Upload image"}
                        </div>
                      </Label>
                      <input id="product-image" type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      <p className="text-[10px] text-muted-foreground">JPG, PNG up to 5MB</p>
                    </div>
                  </div>
                </div>

                {/* Additional Images */}
                <div className="space-y-2 border-b border-border pb-4">
                  <div className="flex items-center justify-between">
                    <Label>Gallery Images</Label>
                    <Label htmlFor="additional-images" className="cursor-pointer">
                      <div className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Plus className="h-3 w-3" /> Add More
                      </div>
                    </Label>
                    <input id="additional-images" type="file" accept="image/*" multiple className="hidden" onChange={handleAdditionalImages} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {existingImages.map((img) => (
                      <div key={img.id} className="relative h-16 w-16 rounded-lg border border-border overflow-hidden group">
                        <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                        <button onClick={() => deleteExistingImage(img.id)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
                    {additionalPreviews.map((preview, i) => (
                      <div key={i} className="relative h-16 w-16 rounded-lg border border-border overflow-hidden group">
                        <img src={preview} alt="" className="h-full w-full object-cover" />
                        <button onClick={() => removeAdditionalImage(i)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
                    {existingImages.length === 0 && additionalPreviews.length === 0 && (
                      <p className="text-[10px] text-muted-foreground">No gallery images yet</p>
                    )}
                  </div>
                </div>

                {/* Barcode Scanner */}
                <div className="space-y-3 border-b border-border pb-4">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <ScanBarcode className="h-4 w-4" /> Scan barcode/QR or enter SKU
                  </p>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label>SKU / Barcode</Label>
                      <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Type or scan barcode..." />
                    </div>
                    <Button type="button" variant={cameraOpen ? "destructive" : "outline"} size="icon" onClick={() => setCameraOpen(!cameraOpen)}>
                      {cameraOpen ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                    </Button>
                  </div>
                  {cameraOpen && <div id="dialog-barcode-reader" className="rounded-lg overflow-hidden border border-border" />}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Brand</Label>
                      <Select value={form.brand} onValueChange={(v) => setForm({ ...form, brand: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4 space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Pricing & Discount</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Regular Price (৳) *</Label><Input type="number" value={form.price} onChange={(e) => handlePriceChange("price", e.target.value)} required /></div>
                      <div className="space-y-2"><Label>Cash Discount Price (৳)</Label><Input type="number" value={form.cash_discount_price} onChange={(e) => handlePriceChange("cash_discount_price", e.target.value)} placeholder="Optional" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Discount %</Label><Input type="number" step="0.1" min="0" max="99" value={form.discount_percentage} onChange={(e) => handlePercentageChange(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Stock</Label><Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} /></div>
                    </div>
                    {Number(form.discount_percentage) > 0 && (
                      <p className="text-xs text-muted-foreground">💰 Save ৳{(Number(form.price) - Number(form.cash_discount_price)).toLocaleString()} ({form.discount_percentage}% off)</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border border-border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      {form.show_in_store ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <Label className="text-sm font-medium">Show in Online Store</Label>
                        <p className="text-[10px] text-muted-foreground">Toggle to show/hide this product from the public store</p>
                      </div>
                    </div>
                    <Switch checked={form.show_in_store} onCheckedChange={(v) => setForm({ ...form, show_in_store: v })} />
                  </div>

                  {/* Variants Section */}
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Variants / Options</h4>
                      <Button type="button" variant="outline" size="sm" onClick={() => setVariants([...variants, { isNew: true, id: `new-${Date.now()}`, variant_label: "", variant_group: "Size", price: form.price || "0", stock_quantity: "0", sku: "", sort_order: variants.length }])}>
                        <Plus className="h-3 w-3 mr-1" /> Add Variant
                      </Button>
                    </div>
                    {variants.length === 0 && <p className="text-[10px] text-muted-foreground">No variants. Product will be sold as-is.</p>}
                    {variants.map((v, idx) => (
                      <div key={v.id} className="grid grid-cols-[1fr_80px_80px_60px_30px] gap-2 items-end">
                        <div className="space-y-1"><Label className="text-[10px]">Label *</Label><Input className="h-8 text-xs" placeholder="e.g. 8 Channel" value={v.variant_label} onChange={(e) => { const updated = [...variants]; updated[idx] = { ...v, variant_label: e.target.value }; setVariants(updated); }} /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Price (৳)</Label><Input className="h-8 text-xs" type="number" value={v.price} onChange={(e) => { const updated = [...variants]; updated[idx] = { ...v, price: e.target.value }; setVariants(updated); }} /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Stock</Label><Input className="h-8 text-xs" type="number" value={v.stock_quantity} onChange={(e) => { const updated = [...variants]; updated[idx] = { ...v, stock_quantity: e.target.value }; setVariants(updated); }} /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Group</Label><Input className="h-8 text-xs" placeholder="Size" value={v.variant_group} onChange={(e) => { const updated = [...variants]; updated[idx] = { ...v, variant_group: e.target.value }; setVariants(updated); }} /></div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (!v.isNew) setDeletedVariantIds(prev => [...prev, v.id]); setVariants(variants.filter((_, i) => i !== idx)); }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <Button type="submit" className="w-full" disabled={saveMutation.isPending || uploading}>
                    {uploading ? "Uploading..." : editing ? "Update" : "Add"} Product
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Multi-select toolbar */}
        {isMultiSelect && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
            <span className="text-sm font-medium">{selectedIds.size}টি সিলেক্টেড</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAll}>
              সব সিলেক্ট ({filteredProducts.length})
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={deselectAll}>ক্লিয়ার</Button>
            <div className="flex items-center gap-2 ml-auto">
              <Select value={bulkCategoryValue} onValueChange={handleBulkCategoryChange}>
                <SelectTrigger className="w-40 h-7 text-xs border-primary/30">
                  <SelectValue placeholder="ক্যাটাগরি চেঞ্জ" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {savingBulkCategory && <Loader2 className="h-4 w-4 animate-spin" />}
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setBulkDeleteConfirm(true)}
                disabled={selectedIds.size === 0 || isDeleting}
              >
                {isDeleting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                {selectedIds.size}টি ডিলিট করুন
              </Button>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {["All", ...categories].map(cat => {
              const count = categoryCounts[cat] || 0;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {cat}
                  <Badge variant={isActive ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] justify-center">{count}</Badge>
                </button>
              );
            })}
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, SKU, or brand..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {isMultiSelect && <TableHead className="w-10"></TableHead>}
                  <TableHead className="w-12">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Regular Price</TableHead>
                  <TableHead>Cash Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="w-16">Store</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts?.map((p: any) => (
                  <TableRow key={p.id} className={`${!p.show_in_store ? "opacity-50" : ""} ${selectedIds.has(p.id) ? "bg-primary/5" : ""}`}>
                    {isMultiSelect && (
                      <TableCell>
                        <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="h-10 w-10 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.name}
                      {variantCounts?.[p.id] ? <Badge variant="secondary" className="ml-2 text-[10px]">{variantCounts[p.id]} variants</Badge> : null}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={catColor[p.category] || ""}>{p.category}</Badge></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{(p as any).brand || "—"}</span></TableCell>
                    <TableCell>৳{Number(p.price).toLocaleString()}</TableCell>
                    <TableCell>
                      {p.cash_discount_price ? (
                        <span className="text-primary font-medium">৳{Number(p.cash_discount_price).toLocaleString()}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {Number(p.discount_percentage) > 0 ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary">{p.discount_percentage}%</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell><span className={Number(p.stock_quantity) <= 5 ? "text-destructive font-medium" : ""}>{p.stock_quantity}</span></TableCell>
                    <TableCell>
                      <Switch checked={p.show_in_store !== false} onCheckedChange={(v) => toggleVisibility.mutate({ id: p.id, show: v })} className="scale-75" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setAiEditingProductId(p.id); setShowAiEdit(true); setAiEditPrompt(""); }} title="AI ছবি এডিট">
                          <Wand2 className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && <TableRow><TableCell colSpan={isMultiSelect ? 12 : 11} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* AI Image Edit Dialog */}
        <Dialog open={showAiEdit} onOpenChange={setShowAiEdit}>
          <DialogContent className="max-w-md bg-[#0f0a1f]/95 border-white/10 backdrop-blur-2xl text-white shadow-2xl shadow-primary/20">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-gradient">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
                AI ছবি এডিট ও পোস্টার
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {/* Current Image Preview */}
              {aiEditingProductId && (
                <div className="relative group aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/5 shadow-inner">
                  {products?.find((p: any) => p.id === aiEditingProductId)?.image_url ? (
                    <img 
                      src={products.find((p: any) => p.id === aiEditingProductId)!.image_url} 
                      alt="" 
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-white/10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}

              {/* Quick Suggestions */}
              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary/80">AI সাজেশন — এক ক্লিকে:</Label>
                <div className="grid grid-cols-1 gap-2.5">
                  {aiSuggestions.map((s, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="group justify-start text-xs h-auto py-3 px-4 rounded-xl border-white/5 bg-white/5 hover:bg-primary/20 hover:border-primary/30 hover:text-white transition-all"
                      disabled={isAiEditing}
                      onClick={() => aiEditingProductId && handleAiEditImage(aiEditingProductId, s.prompt)}
                    >
                      <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 mr-3 transition-colors">
                        <Wand2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Custom prompt */}
              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary/80">অথবা নিজের ইন্সট্রাকশন লিখুন:</Label>
                <div className="relative">
                  <Input
                    value={aiEditPrompt}
                    onChange={(e) => setAiEditPrompt(e.target.value)}
                    placeholder="e.g. এই ছবিটিকে একটি প্রিমিয়াম সেল পোস্টার বানান..."
                    className="bg-white/5 border-white/10 rounded-xl pl-4 pr-10 py-6 text-sm placeholder:text-white/20 focus:border-primary/40 focus:ring-primary/20 transition-all"
                    disabled={isAiEditing}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-primary/10 rounded-lg">
                    <Search className="h-3.5 w-3.5 text-primary/50" />
                  </div>
                </div>
                <Button
                  className="w-full py-6 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25 font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isAiEditing || !aiEditPrompt.trim()}
                  onClick={() => aiEditingProductId && handleAiEditImage(aiEditingProductId, aiEditPrompt)}
                >
                  {isAiEditing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />AI কাজ করছে...</>
                  ) : (
                    <><Wand2 className="h-4 w-4 mr-2" />AI দিয়ে জেনারেট করুন</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Single Delete Confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteMutation.mutate(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        title="প্রোডাক্ট স্থায়ীভাবে ডিলিট করুন"
        itemName={products?.find((p: any) => p.id === deleteConfirmId)?.name}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDeleteDialog
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
        onConfirm={() => {
          setBulkDeleteConfirm(false);
          handleBulkDelete();
        }}
        title={`${selectedIds.size}টি প্রোডাক্ট স্থায়ীভাবে ডিলিট করুন`}
        description={`আপনি কি নিশ্চিত যে ${selectedIds.size}টি প্রোডাক্ট স্থায়ীভাবে ডিলিট করতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।`}
        loading={isDeleting}
      />
    </>
  );
}
