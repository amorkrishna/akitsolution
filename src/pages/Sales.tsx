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
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Sales() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    product_id: "",
    client_id: "",
    quantity: 1,
    unit_price: 0,
    sale_date: new Date().toISOString().split("T")[0],
    payment_status: "pending",
    notes: "",
  });

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("*, products(name), clients(name)")
        .order("sale_date", { ascending: false });
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("id, name, price")).data || [],
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await supabase.from("clients").select("id, name")).data || [],
  });

  const createSale = useMutation({
    mutationFn: async () => {
      const total = form.quantity * form.unit_price;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("sales").insert({
        product_id: form.product_id || null,
        client_id: form.client_id || null,
        quantity: form.quantity,
        unit_price: form.unit_price,
        total,
        sale_date: form.sale_date,
        payment_status: form.payment_status,
        notes: form.notes || null,
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Sale recorded successfully" });
      setOpen(false);
      setForm({ product_id: "", client_id: "", quantity: 1, unit_price: 0, sale_date: new Date().toISOString().split("T")[0], payment_status: "pending", notes: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Sale deleted" });
    },
  });

  const handleProductChange = (productId: string) => {
    const product = products?.find((p: any) => p.id === productId);
    setForm({ ...form, product_id: productId, unit_price: product?.price || 0 });
  };

  const totalSales = sales?.reduce((sum: number, s: any) => sum + Number(s.total), 0) || 0;
  const paidSales = sales?.filter((s: any) => s.payment_status === "paid").reduce((sum: number, s: any) => sum + Number(s.total), 0) || 0;

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    paid: "bg-success/10 text-success border-success/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
            <p className="text-muted-foreground text-sm">Record and manage product sales</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Sale</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Record New Sale</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Product</Label>
                  <Select value={form.product_id} onValueChange={handleProductChange}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} — ৳{p.price}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Client</Label>
                  <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select client (optional)" /></SelectTrigger>
                    <SelectContent>
                      {clients?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quantity</Label><Input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} /></div>
                  <div><Label>Unit Price (৳)</Label><Input type="number" min={0} value={form.unit_price} onChange={e => setForm({ ...form, unit_price: +e.target.value })} /></div>
                </div>
                <div><Label>Total</Label><Input disabled value={`৳${(form.quantity * form.unit_price).toLocaleString()}`} /></div>
                <div><Label>Sale Date</Label><Input type="date" value={form.sale_date} onChange={e => setForm({ ...form, sale_date: e.target.value })} /></div>
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
                <Button className="w-full" onClick={() => createSale.mutate()} disabled={createSale.isPending}>
                  {createSale.isPending ? "Saving..." : "Record Sale"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Sales</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">৳{totalSales.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Paid</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-success">৳{paidSales.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Transactions</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{sales?.length || 0}</p></CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : sales?.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No sales recorded yet</TableCell></TableRow>
                ) : sales?.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{format(new Date(s.sale_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm font-medium">{s.products?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{s.clients?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{s.quantity}</TableCell>
                    <TableCell className="text-sm font-medium">৳{Number(s.total).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor[s.payment_status] || ""}>{s.payment_status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteSale.mutate(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
);
}
