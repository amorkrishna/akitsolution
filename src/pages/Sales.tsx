import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  TrendingUp, Plus, Search, Edit2, Trash2, Package,
  Users, DollarSign, ShoppingBag, Filter, ArrowUpRight,
  CheckCircle, Clock, XCircle, Scan
} from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { BarcodeScanner } from "@/components/BarcodeScanner";

type PaymentStatus = "paid" | "pending" | "partial";

interface SaleForm {
  product_id: string;
  client_id: string;
  quantity: number;
  unit_price: number;
  payment_status: PaymentStatus;
  sale_date: string;
  notes: string;
  selected_serials: string[];
}

const defaultForm: SaleForm = {
  product_id: "",
  client_id: "",
  quantity: 1,
  unit_price: 0,
  payment_status: "paid",
  sale_date: format(new Date(), "yyyy-MM-dd"),
  notes: "",
  selected_serials: [],
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  paid: { label: "Paid", color: "bg-success/10 text-success border-success/20", icon: CheckCircle },
  pending: { label: "Pending", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  partial: { label: "Partial", color: "bg-info/10 text-info border-info/20", icon: XCircle },
};

export default function Sales() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<SaleForm>(defaultForm);

  // Data queries
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(name, sku), clients(name)")
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-for-sales"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, price, sku, has_serial").order("name");
      return data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-sales"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: availableSerials = [], isLoading: isLoadingSerials } = useQuery({
    queryKey: ["product-serials", form.product_id],
    enabled: !!form.product_id,
    queryFn: async () => {
      // If editing, we also want to fetch serials that are already attached to this sale
      let query = supabase.from("product_serials").select("*").eq("product_id", form.product_id);
      
      if (editingId) {
        query = query.or(`status.eq.in_stock,sale_id.eq.${editingId}`);
      } else {
        query = query.eq("status", "in_stock");
      }
      
      const { data } = await query;
      return data || [];
    }
  });

  const selectedProduct = products.find(p => p.id === form.product_id);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: SaleForm & { id?: string }) => {
      if (selectedProduct?.has_serial && data.selected_serials.length !== data.quantity) {
         throw new Error(`Please select exactly ${data.quantity} serial number(s). You selected ${data.selected_serials.length}.`);
      }

      const payload = {
        product_id: data.product_id || null,
        client_id: data.client_id || null,
        quantity: data.quantity,
        unit_price: data.unit_price,
        total: data.quantity * data.unit_price,
        payment_status: data.payment_status,
        sale_date: data.sale_date,
        notes: data.notes || null,
      };

      let saleId = data.id;

      if (saleId) {
        const { error } = await supabase.from("sales").update(payload).eq("id", saleId);
        if (error) throw error;
        
        // Reset previously attached serials
        await supabase.from("product_serials").update({ status: 'in_stock', sale_id: null }).eq("sale_id", saleId);
      } else {
        const { data: newSale, error } = await supabase.from("sales").insert(payload).select().single();
        if (error) throw error;
        saleId = newSale.id;
      }
      
      // Attach selected serials
      if (selectedProduct?.has_serial && data.selected_serials.length > 0) {
         const { error } = await supabase.from("product_serials").update({ status: 'sold', sale_id: saleId }).in("id", data.selected_serials);
         if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["product-serials"] });
      toast.success(editingId ? "Sale updated!" : "Sale recorded!");
      setDialogOpen(false);
      setForm(defaultForm);
      setEditingId(null);
    },
    onError: (err: any) => toast.error(err.message || "Something went wrong"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First un-assign serials
      await supabase.from("product_serials").update({ status: 'in_stock', sale_id: null }).eq("sale_id", id);
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["product-serials"] });
      toast.success("Sale deleted");
      setDeleteId(null);
    },
  });

  // Stats
  const totalRevenue = sales.filter(s => s.payment_status === "paid").reduce((sum, s) => sum + Number(s.total), 0);
  const pendingRevenue = sales.filter(s => s.payment_status === "pending").reduce((sum, s) => sum + Number(s.total), 0);
  const totalSales = sales.length;
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todaySales = sales.filter(s => s.sale_date === todayStr).length;

  // Filtered list
  const filtered = sales.filter(s => {
    const matchSearch =
      !search ||
      (s as any).products?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (s as any).clients?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.payment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openNew = () => {
    setForm(defaultForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = async (sale: any) => {
    // Fetch currently attached serials
    const { data: serials } = await supabase.from("product_serials").select("id").eq("sale_id", sale.id);
    const selected_serials = serials?.map(s => s.id) || [];

    setForm({
      product_id: sale.product_id || "",
      client_id: sale.client_id || "",
      quantity: sale.quantity,
      unit_price: Number(sale.unit_price),
      payment_status: sale.payment_status as PaymentStatus,
      sale_date: sale.sale_date,
      notes: sale.notes || "",
      selected_serials,
    });
    setEditingId(sale.id);
    setDialogOpen(true);
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    setForm(f => ({ 
      ...f, 
      product_id: productId, 
      unit_price: product ? Number(product.price) : f.unit_price,
      selected_serials: [] // Reset serials when product changes
    }));
  };

  const handleBarcodeDetected = (skuOrSn: string) => {
    // 1. Check if it's a serial number for the currently selected product
    if (form.product_id && selectedProduct?.has_serial) {
      const serial = availableSerials.find((s: any) => s.serial_number === skuOrSn);
      if (serial) {
        if (!form.selected_serials.includes(serial.id)) {
          if (form.selected_serials.length >= form.quantity) {
            toast.error(`You only need ${form.quantity} serial(s).`);
          } else {
            setForm(f => ({ ...f, selected_serials: [...f.selected_serials, serial.id] }));
            toast.success(`Serial added: ${serial.serial_number}`);
          }
        } else {
          toast.info("Serial already selected.");
        }
        return;
      }
    }

    // 2. Otherwise, treat as Product SKU
    const product = products?.find((p: any) => p.sku === skuOrSn);
    if (product) {
      handleProductChange(product.id);
      toast.success(`Product selected: ${product.name}`);
    } else {
      toast.error(`Not found: ${skuOrSn}`);
    }
  };

  const handleSubmit = () => {
    if (!form.quantity || form.unit_price <= 0) {
      toast.error("Please fill in quantity and price.");
      return;
    }
    saveMutation.mutate({ ...form, id: editingId || undefined });
  };

  const toggleSerialSelection = (serialId: string) => {
    setForm(f => {
      const newSerials = f.selected_serials.includes(serialId)
        ? f.selected_serials.filter(id => id !== serialId)
        : [...f.selected_serials, serialId];
      
      if (newSerials.length > f.quantity) {
        toast.error(`You cannot select more than ${f.quantity} serial(s).`);
        return f;
      }
      return { ...f, selected_serials: newSerials };
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Sales
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track all your direct sales records</p>
        </div>
        <Button onClick={openNew} className="gap-2 corporate-gradient text-white border-0">
          <Plus className="h-4 w-4" />
          Add Sale
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-3.5 w-3.5 text-success" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Paid Revenue</span>
            </div>
            <p className="text-xl font-black text-success">৳{totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-warning" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Pending</span>
            </div>
            <p className="text-xl font-black text-warning">৳{pendingRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Total Sales</span>
            </div>
            <p className="text-xl font-black">{totalSales}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <ArrowUpRight className="h-3.5 w-3.5 text-accent" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Today</span>
            </div>
            <p className="text-xl font-black">{todaySales}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main List */}
      <Card className="glass-card border-0 shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-card flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product or client..."
              className="pl-8 bg-muted/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[140px] bg-muted/30">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="divide-y">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Loading sales...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center">
              <Package className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">No sales found.</p>
            </div>
          ) : (
            filtered.map((s: any) => {
              const status = paymentStatusConfig[s.payment_status as PaymentStatus] || paymentStatusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${status.color}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{(s.products as any)?.name || "Unknown Product"}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${status.color}`}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {(s.clients as any)?.name || "Walk-in Customer"}
                        </span>
                        <span>•</span>
                        <span>Qty: {s.quantity}</span>
                        <span>•</span>
                        <span>{format(new Date(s.sale_date), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Total Amount</p>
                      <p className="font-bold text-foreground">৳{Number(s.total).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Sale Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Sale" : "Record New Sale"}</DialogTitle>
          </DialogHeader>

          <div className="bg-primary/5 rounded-md p-3 mb-2 flex flex-col">
            <span className="text-xs font-semibold flex items-center mb-2"><Scan className="w-3 h-3 mr-1" /> Barcode/Serial Scanner</span>
            <BarcodeScanner onBarcodeDetected={handleBarcodeDetected} />
          </div>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Product <span className="text-destructive">*</span></Label>
              <Select value={form.product_id} onValueChange={handleProductChange}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct?.has_serial && (
              <div className="grid gap-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                <Label className="flex items-center text-primary text-xs font-semibold">
                  <Scan className="w-3 h-3 mr-1" /> Serial Numbers ({form.selected_serials.length} / {form.quantity})
                </Label>
                {isLoadingSerials ? (
                  <div className="text-xs text-muted-foreground">Loading serials...</div>
                ) : availableSerials.length === 0 ? (
                  <div className="text-xs text-destructive">No serials in stock for this product.</div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {availableSerials.map((s: any) => {
                      const isSelected = form.selected_serials.includes(s.id);
                      return (
                        <Badge 
                          key={s.id} 
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer ${isSelected ? 'bg-primary' : 'hover:border-primary/50 text-muted-foreground'}`}
                          onClick={() => toggleSerialSelection(s.id)}
                        >
                          {s.serial_number}
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground">Scan or click to select exact serials.</span>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Client (Optional)</Label>
              <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select client (Walk-in)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Walk-in Customer --</SelectItem>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.quantity || ""}
                  onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                  className="bg-background"
                />
              </div>
              <div className="grid gap-2">
                <Label>Unit Price (৳)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.unit_price || ""}
                  onChange={e => setForm({ ...form, unit_price: Number(e.target.value) })}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Payment Status</Label>
                <Select value={form.payment_status} onValueChange={(v: PaymentStatus) => setForm({ ...form, payment_status: v })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.sale_date}
                  onChange={e => setForm({ ...form, sale_date: e.target.value })}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Any special notes..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="resize-none bg-background h-16"
              />
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between items-center border-t pt-4">
            <div className="text-sm font-medium text-muted-foreground flex items-center w-full sm:w-auto justify-between sm:justify-start mb-4 sm:mb-0">
              Total: <span className="ml-2 text-xl font-black text-foreground">৳{(form.quantity * form.unit_price).toLocaleString()}</span>
            </div>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="w-full sm:w-auto corporate-gradient border-0 text-white shadow-md shadow-primary/20 hover:shadow-primary/40 transition-shadow">
              {saveMutation.isPending ? "Saving..." : "Save Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Sale"
        description="Are you sure you want to delete this sale? This action cannot be undone."
      />
    </div>
  );
}
