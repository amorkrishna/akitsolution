import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, PackagePlus, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { format } from "date-fns";
import { BarcodeScanner } from "@/components/BarcodeScanner";

export default function Purchases() {
  const { toast } = useToast();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    product_id: "",
    supplier_name: "",
    quantity: 1,
    unit_cost: 0,
    purchase_date: new Date().toISOString().split("T")[0],
    payment_status: "pending",
    notes: "",
  });

  const { data: purchases, isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data } = await supabase
        .from("purchases")
        .select("*, products(name)")
        .order("purchase_date", { ascending: false });
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("id, name, price, sku, stock_quantity")).data || [],
  });

  const savePurchase = useMutation({
    mutationFn: async () => {
      const total = form.quantity * form.unit_cost;
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        product_id: form.product_id || null,
        supplier_name: form.supplier_name,
        quantity: form.quantity,
        unit_cost: form.unit_cost,
        total_cost: total,
        purchase_date: form.purchase_date,
        payment_status: form.payment_status,
        notes: form.notes || null,
        created_by: user?.id || null,
      };
      if (editId) {
        const { error } = await supabase.from("purchases").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("purchases").insert(payload);
        if (error) throw error;
        // Auto-update stock and log inventory movement
        if (form.product_id) {
          const product = products?.find((p: any) => p.id === form.product_id);
          const currentQty = product?.stock_quantity ?? 0;
          await supabase.from("products").update({ stock_quantity: currentQty + form.quantity }).eq("id", form.product_id);
          await supabase.from("inventory_movements").insert({
            product_id: form.product_id,
            movement_type: "in",
            quantity: form.quantity,
            reference_type: "purchase",
            notes: `Supplier: ${form.supplier_name}`,
            created_by: user?.id || null,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast({ title: editId ? "Purchase updated" : "Purchase recorded" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePurchase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast({ title: "Purchase deleted" });
    },
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setForm({ product_id: "", supplier_name: "", quantity: 1, unit_cost: 0, purchase_date: new Date().toISOString().split("T")[0], payment_status: "pending", notes: "" });
  };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      product_id: p.product_id || "",
      supplier_name: p.supplier_name,
      quantity: p.quantity,
      unit_cost: Number(p.unit_cost),
      purchase_date: p.purchase_date,
      payment_status: p.payment_status,
      notes: p.notes || "",
    });
    setOpen(true);
  };

  const handleBarcodeDetected = (sku: string) => {
    const product = products?.find((p: any) => p.sku === sku);
    if (product) {
      setForm({ ...form, product_id: product.id, unit_cost: Number(product.price) });
      toast({ title: "Product found", description: product.name });
    } else {
      toast({ title: "Not found", description: `No product with SKU: ${sku}`, variant: "destructive" });
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products?.find((p: any) => p.id === productId);
    setForm({ ...form, product_id: productId, unit_cost: product?.price ? Number(product.price) : 0 });
  };

  const totalPurchases = purchases?.reduce((sum: number, p: any) => sum + Number(p.total_cost), 0) || 0;
  const paidPurchases = purchases?.filter((p: any) => p.payment_status === "paid").reduce((sum: number, p: any) => sum + Number(p.total_cost), 0) || 0;

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    paid: "bg-success/10 text-success border-success/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
            <p className="text-muted-foreground text-sm">Track product procurement & inventory purchases</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Purchase</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editId ? "Edit Purchase" : "Record New Purchase"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <BarcodeScanner onBarcodeDetected={handleBarcodeDetected} />
                <div>
                  <Label>Product</Label>
                  <Select value={form.product_id} onValueChange={handleProductChange}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.sku ? `(${p.sku})` : ""} — ৳{p.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Supplier Name *</Label>
                  <Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} placeholder="Enter supplier name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quantity</Label><Input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} /></div>
                  <div><Label>Unit Cost (৳)</Label><Input type="number" min={0} value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: +e.target.value })} /></div>
                </div>
                <div><Label>Total Cost</Label><Input disabled value={`৳${(form.quantity * form.unit_cost).toLocaleString()}`} /></div>
                <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} /></div>
                <div>
                  <Label>Payment Status</Label>
                  <Select value={form.payment_status} onValueChange={v => setForm({ ...form, payment_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <Button className="w-full" onClick={() => savePurchase.mutate()} disabled={savePurchase.isPending || !form.supplier_name}>
                  {savePurchase.isPending ? "Saving..." : editId ? "Update Purchase" : "Record Purchase"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Purchases</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">৳{totalPurchases.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Paid</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-success">৳{paidPurchases.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Transactions</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{purchases?.length || 0}</p></CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : purchases?.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No purchases recorded yet</TableCell></TableRow>
                ) : purchases?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{format(new Date(p.purchase_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm font-medium">{p.products?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{p.supplier_name}</TableCell>
                    <TableCell className="text-sm">{p.quantity}</TableCell>
                    <TableCell className="text-sm font-medium">৳{Number(p.total_cost).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor[p.payment_status] || ""}>{p.payment_status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deletePurchase.mutate(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            deletePurchase.mutate(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        title="স্থায়ীভাবে ডিলিট করুন"
      />
    </>
);
}
