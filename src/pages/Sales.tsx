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
  CheckCircle, Clock, XCircle,
} from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

type PaymentStatus = "paid" | "pending" | "partial";

interface SaleForm {
  product_id: string;
  client_id: string;
  quantity: number;
  unit_price: number;
  payment_status: PaymentStatus;
  sale_date: string;
  notes: string;
}

const defaultForm: SaleForm = {
  product_id: "",
  client_id: "",
  quantity: 1,
  unit_price: 0,
  payment_status: "paid",
  sale_date: format(new Date(), "yyyy-MM-dd"),
  notes: "",
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
      const { data } = await supabase.from("products").select("id, name, price, sku").order("name");
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

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: SaleForm & { id?: string }) => {
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
      if (data.id) {
        const { error } = await supabase.from("sales").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sales").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success(editingId ? "Sale updated!" : "Sale recorded!");
      setDialogOpen(false);
      setForm(defaultForm);
      setEditingId(null);
    },
    onError: () => toast.error("Something went wrong"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
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

  const openEdit = (sale: any) => {
    setForm({
      product_id: sale.product_id || "",
      client_id: sale.client_id || "",
      quantity: sale.quantity,
      unit_price: Number(sale.unit_price),
      payment_status: sale.payment_status as PaymentStatus,
      sale_date: sale.sale_date,
      notes: sale.notes || "",
    });
    setEditingId(sale.id);
    setDialogOpen(true);
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    setForm(f => ({ ...f, product_id: productId, unit_price: product ? Number(product.price) : f.unit_price }));
  };

  const handleSubmit = () => {
    if (!form.quantity || form.unit_price <= 0) {
      toast.error("Please fill in quantity and price.");
      return;
    }
    saveMutation.mutate({ ...form, id: editingId || undefined });
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product or client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "paid", "pending", "partial"] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {status === "all" ? "All" : paymentStatusConfig[status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Table */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Sales Records
            <Badge variant="secondary" className="ml-auto">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No sales found</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openNew}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Record First Sale
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_100px_100px_80px] gap-4 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                <span>Product</span>
                <span>Client</span>
                <span>Qty</span>
                <span>Total</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>
              {filtered.map(sale => {
                const cfg = paymentStatusConfig[sale.payment_status as PaymentStatus] || paymentStatusConfig.pending;
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={sale.id}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_100px_100px_80px] gap-2 sm:gap-4 px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    {/* Product */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{(sale as any).products?.name || "Unknown Product"}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(sale.sale_date), "dd MMM yyyy")}</p>
                      </div>
                    </div>
                    {/* Client */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{(sale as any).clients?.name || "Walk-in"}</span>
                    </div>
                    {/* Qty */}
                    <div className="flex items-center">
                      <span className="text-sm font-semibold">×{sale.quantity}</span>
                    </div>
                    {/* Total */}
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">৳{Number(sale.total).toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground">৳{Number(sale.unit_price).toLocaleString()} each</span>
                    </div>
                    {/* Status */}
                    <div className="flex items-center">
                      <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.color}`}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {cfg.label}
                      </Badge>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(sale)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(sale.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) { setForm(defaultForm); setEditingId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {editingId ? "Edit Sale" : "Record New Sale"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Product */}
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={form.product_id} onValueChange={handleProductChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Client */}
            <div className="space-y-1.5">
              <Label>Client <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Walk-in Customer</SelectItem>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Qty & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Price (৳) *</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.unit_price}
                  onChange={e => setForm(f => ({ ...f, unit_price: Number(e.target.value) }))}
                />
              </div>
            </div>
            {/* Total preview */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-base font-bold text-primary">৳{(form.quantity * form.unit_price).toLocaleString()}</span>
            </div>
            {/* Status & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Status</Label>
                <Select value={form.payment_status} onValueChange={v => setForm(f => ({ ...f, payment_status: v as PaymentStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">✅ Paid</SelectItem>
                    <SelectItem value="pending">⏳ Pending</SelectItem>
                    <SelectItem value="partial">🔄 Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sale Date</Label>
                <Input
                  type="date"
                  value={form.sale_date}
                  onChange={e => setForm(f => ({ ...f, sale_date: e.target.value }))}
                />
              </div>
            </div>
            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                rows={2}
                placeholder="Any additional notes..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="corporate-gradient text-white border-0">
              {saveMutation.isPending ? "Saving..." : editingId ? "Update Sale" : "Record Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDeleteDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Sale"
        description="Are you sure you want to delete this sale record? This action cannot be undone."
      />
    </div>
  );
}
