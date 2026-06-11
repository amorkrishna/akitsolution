import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Package, AlertTriangle, PackageX, DollarSign, Search, Plus, Minus, History, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const CATEGORIES = ["All", "CCTV", "Attendance Device", "Networking", "Server", "Accessories", "Computer", "Printer", "Software", "Storage", "Smart Home", "Audio/Video", "Mobile", "Other"];
const STOCK_FILTERS = ["All", "In Stock", "Low Stock", "Out of Stock"];
const LOW_STOCK_THRESHOLD = 5;

export default function Inventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [adjustForm, setAdjustForm] = useState({ type: "in" as "in" | "out" | "adjustment", quantity: 1, notes: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["inventory-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data || [];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["inventory-movements", expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("product_id", expandedId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const adjustStock = useMutation({
    mutationFn: async () => {
      if (!adjustProduct) return;
      const { data: { user } } = await supabase.auth.getUser();
      const qty = adjustForm.type === "out" ? -adjustForm.quantity : adjustForm.quantity;
      const newStock = Math.max(0, adjustProduct.stock_quantity + qty);

      const { error: moveErr } = await supabase.from("inventory_movements").insert({
        product_id: adjustProduct.id,
        movement_type: adjustForm.type,
        quantity: adjustForm.quantity,
        reference_type: "manual",
        notes: adjustForm.notes || null,
        created_by: user?.id || null,
      });
      if (moveErr) throw moveErr;

      const { error: updateErr } = await supabase.from("products").update({ stock_quantity: newStock }).eq("id", adjustProduct.id);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      toast({ title: "স্টক আপডেট হয়েছে" });
      setAdjustOpen(false);
      setAdjustProduct(null);
      setAdjustForm({ type: "in", quantity: 1, notes: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = products.filter((p: any) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.sku || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
    if (stockFilter === "Out of Stock" && p.stock_quantity > 0) return false;
    if (stockFilter === "Low Stock" && (p.stock_quantity === 0 || p.stock_quantity >= LOW_STOCK_THRESHOLD)) return false;
    if (stockFilter === "In Stock" && p.stock_quantity < LOW_STOCK_THRESHOLD) return false;
    return true;
  });

  const totalProducts = products.length;
  const totalValue = products.reduce((s: number, p: any) => s + p.price * p.stock_quantity, 0);
  const lowStock = products.filter((p: any) => p.stock_quantity > 0 && p.stock_quantity < LOW_STOCK_THRESHOLD).length;
  const outOfStock = products.filter((p: any) => p.stock_quantity === 0).length;

  const getStatusBadge = (qty: number) => {
    if (qty === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (qty < LOW_STOCK_THRESHOLD) return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Low Stock</Badge>;
    return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">In Stock</Badge>;
  };

  return (
      <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">ইনভেন্টরি ম্যানেজমেন্ট</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">মোট প্রোডাক্ট</p><p className="text-xl font-bold">{totalProducts}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><DollarSign className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-xs text-muted-foreground">স্টক মূল্য</p><p className="text-xl font-bold">৳{totalValue.toLocaleString()}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10"><AlertTriangle className="h-5 w-5 text-yellow-600" /></div>
                <div><p className="text-xs text-muted-foreground">লো স্টক</p><p className="text-xl font-bold">{lowStock}</p></div>
              </div>
              {lowStock > 0 && (
                <Button variant="outline" size="sm" onClick={async () => {
                  const { default: jsPDF } = await import("jspdf");
                  const { default: autoTable } = await import("jspdf-autotable");
                  const doc = new jsPDF();
                  const lowStockItems = products.filter((p: any) => p.stock_quantity > 0 && p.stock_quantity < LOW_STOCK_THRESHOLD);
                  
                  doc.setFontSize(20);
                  doc.text("Purchase Order (Auto-Generated)", 14, 22);
                  doc.setFontSize(11);
                  doc.setTextColor(100);
                  doc.text(`Date: ${format(new Date(), "dd MMM yyyy")}`, 14, 30);
                  doc.text(`Total Items to Restock: ${lowStockItems.length}`, 14, 36);

                  const tableData = lowStockItems.map((p: any) => [
                    p.name,
                    p.sku || "N/A",
                    p.category,
                    p.stock_quantity.toString(),
                    "10" // Default suggested order quantity
                  ]);

                  autoTable(doc, {
                    startY: 45,
                    head: [["Product Name", "SKU", "Category", "Current Stock", "Suggested Order Qty"]],
                    body: tableData,
                    theme: "grid",
                    styles: { fontSize: 10 },
                    headStyles: { fillColor: [41, 128, 185] }
                  });

                  doc.save(`PO-LowStock-${format(new Date(), "yyyyMMdd")}.pdf`);
                  toast({ title: "Purchase Order generated" });
                }}>
                  <Package className="h-3 w-3 mr-1" /> Auto PO
                </Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10"><PackageX className="h-5 w-5 text-destructive" /></div>
                <div><p className="text-xs text-muted-foreground">আউট অফ স্টক</p><p className="text-xl font-bold">{outOfStock}</p></div>
              </div>
              {outOfStock > 0 && (
                <Button variant="outline" size="sm" onClick={async () => {
                  const { default: jsPDF } = await import("jspdf");
                  const { default: autoTable } = await import("jspdf-autotable");
                  const doc = new jsPDF();
                  const outOfStockItems = products.filter((p: any) => p.stock_quantity === 0);
                  
                  doc.setFontSize(20);
                  doc.text("Restock Urgent (Out of Stock)", 14, 22);
                  doc.setFontSize(11);
                  doc.setTextColor(100);
                  doc.text(`Date: ${format(new Date(), "dd MMM yyyy")}`, 14, 30);
                  doc.text(`Total Items to Restock: ${outOfStockItems.length}`, 14, 36);

                  const tableData = outOfStockItems.map((p: any) => [
                    p.name,
                    p.sku || "N/A",
                    p.category,
                    "0",
                    "20" // Default suggested order quantity
                  ]);

                  autoTable(doc, {
                    startY: 45,
                    head: [["Product Name", "SKU", "Category", "Current Stock", "Suggested Order Qty"]],
                    body: tableData,
                    theme: "grid",
                    styles: { fontSize: 10 },
                    headStyles: { fillColor: [231, 76, 60] }
                  });

                  doc.save(`Restock-Urgent-${format(new Date(), "yyyyMMdd")}.pdf`);
                  toast({ title: "Urgent Restock PDF generated" });
                }}>
                  <PackageX className="h-3 w-3 mr-1" /> Restock
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="নাম বা SKU দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{STOCK_FILTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Stock Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>প্রোডাক্ট</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>ক্যাটাগরি</TableHead>
                  <TableHead className="text-right">দাম</TableHead>
                  <TableHead className="text-right">স্টক</TableHead>
                  <TableHead className="text-right">মূল্য</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead className="text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">কোনো প্রোডাক্ট পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((p: any) => (
                  <React.Fragment key={p.id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {expandedId === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {p.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{p.sku || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                      <TableCell className="text-right">৳{p.price.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">{p.stock_quantity}</TableCell>
                      <TableCell className="text-right">৳{(p.price * p.stock_quantity).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(p.stock_quantity)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setAdjustProduct(p); setAdjustForm({ type: "in", quantity: 1, notes: "" }); setAdjustOpen(true); }}>
                            <Plus className="h-3 w-3 mr-1" />In
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setAdjustProduct(p); setAdjustForm({ type: "out", quantity: 1, notes: "" }); setAdjustOpen(true); }}>
                            <Minus className="h-3 w-3 mr-1" />Out
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedId === p.id && (
                      <TableRow key={`${p.id}-history`}>
                        <TableCell colSpan={8} className="bg-muted/30 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <History className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">স্টক মুভমেন্ট হিস্ট্রি</span>
                          </div>
                          {movements.length === 0 ? (
                            <p className="text-sm text-muted-foreground">কোনো মুভমেন্ট নেই</p>
                          ) : (
                            <div className="space-y-1">
                              {movements.map((m: any) => (
                                <div key={m.id} className="flex items-center gap-3 text-sm py-1 border-b border-border/30 last:border-0">
                                  <Badge variant={m.movement_type === "in" ? "default" : m.movement_type === "out" ? "destructive" : "secondary"} className="text-xs w-20 justify-center">
                                    {m.movement_type === "in" ? "▲ IN" : m.movement_type === "out" ? "▼ OUT" : "⟳ ADJ"}
                                  </Badge>
                                  <span className="font-medium w-12 text-right">{m.quantity}</span>
                                  <Badge variant="outline" className="text-xs">{m.reference_type}</Badge>
                                  <span className="text-muted-foreground flex-1 truncate">{m.notes || "—"}</span>
                                  <span className="text-xs text-muted-foreground">{format(new Date(m.created_at), "dd MMM yyyy HH:mm")}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>স্টক অ্যাডজাস্ট — {adjustProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ধরণ</Label>
              <Select value={adjustForm.type} onValueChange={(v: any) => setAdjustForm({ ...adjustForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In (যোগ)</SelectItem>
                  <SelectItem value="out">Stock Out (বিয়োগ)</SelectItem>
                  <SelectItem value="adjustment">Adjustment (সংশোধন)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>পরিমাণ</Label>
              <Input type="number" min={1} value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label>নোট</Label>
              <Textarea value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} placeholder="কারণ বা রেফারেন্স..." />
            </div>
            <div className="flex justify-between items-center pt-2">
              <p className="text-sm text-muted-foreground">
                বর্তমান: <strong>{adjustProduct?.stock_quantity}</strong> → নতুন: <strong>
                  {adjustProduct ? Math.max(0, adjustProduct.stock_quantity + (adjustForm.type === "out" ? -adjustForm.quantity : adjustForm.quantity)) : 0}
                </strong>
              </p>
              <Button onClick={() => adjustStock.mutate()} disabled={adjustStock.isPending}>
                {adjustStock.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </>
);
}
