import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, MessageCircle, Trash2, Eye, EyeOff, MessageSquare, FileText, FilePlus2 } from "lucide-react";
import { openWhatsApp, orderStatusMessage } from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { GenerateInvoiceDialog } from "@/components/GenerateInvoiceDialog";

export default function Orders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "orders";
  const [activeTab, setActiveTab] = useState(tabParam);

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["store-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_orders")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["store-messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_messages")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("store_orders").update({ status }).eq("id", id);
      if (error) throw error;

      // When order is completed, auto-create a sale and decrement stock
      if (status === "completed") {
        const order = orders?.find(o => o.id === id);
        if (order) {
          // Create sale record
          await supabase.from("sales").insert({
            product_id: order.product_id || null,
            quantity: order.quantity,
            unit_price: Number(order.item_price),
            total: Number(order.item_price) * order.quantity,
            payment_status: "paid",
            notes: `Store Order - ${order.customer_name} (${order.customer_phone || ""})`,
          });

          // Decrement stock if product exists
          if (order.product_id) {
            const { data: product } = await supabase.from("products").select("stock_quantity").eq("id", order.product_id).single();
            if (product) {
              await supabase.from("products").update({ stock_quantity: Math.max(0, product.stock_quantity - order.quantity) }).eq("id", order.product_id);
              await supabase.from("inventory_movements").insert({
                product_id: order.product_id,
                movement_type: "out",
                quantity: order.quantity,
                reference_type: "sale",
                notes: `Store Order - ${order.customer_name}`,
              });
            }
          }
        }
      }
      // Auto-open WhatsApp with status message
      const order = orders?.find(o => o.id === id);
      if (order?.customer_phone) {
        openWhatsApp(order.customer_phone, orderStatusMessage(order, status));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Order status updated" });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      toast({ title: "Order deleted" });
    },
  });

  const toggleMessageRead = useMutation({
    mutationFn: async ({ id, is_read }: { id: string; is_read: boolean }) => {
      const { error } = await supabase.from("store_messages").update({ is_read }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["store-messages"] }),
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-messages"] });
      toast({ title: "Message deleted" });
    },
  });

  const unreadCount = messages?.filter(m => !m.is_read).length || 0;
  const pendingOrders = orders?.filter(o => o.status === "pending").length || 0;

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    confirmed: "bg-info/10 text-info",
    completed: "bg-success/10 text-success",
    cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders & Messages</h1>
          <p className="text-muted-foreground text-sm">
            Manage store orders and customer inquiries
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSearchParams({ tab: val }, { replace: true }); }}>
          <TabsList>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Orders {pendingOrders > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{pendingOrders}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Messages {unreadCount > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{unreadCount}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card className="glass-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{order.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_phone || order.customer_email || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{order.item_name}</TableCell>
                        <TableCell>৳{Number(order.item_price).toLocaleString()}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>
                          <Select value={order.status} onValueChange={(v) => updateOrderStatus.mutate({ id: order.id, status: v })}>
                            <SelectTrigger className="h-7 w-28">
                              <Badge variant="outline" className={`text-[10px] ${statusColor[order.status] || ""}`}>
                                {order.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {order.invoice_id ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate("/invoices")}
                                title="View Invoice"
                              >
                                <FileText className="h-4 w-4 text-primary" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setInvoiceOrder(order)}
                                title="Generate Invoice"
                              >
                                <FilePlus2 className="h-4 w-4 text-info" />
                              </Button>
                            )}
                            {order.customer_phone && (
                              <Button variant="ghost" size="icon" onClick={() => openWhatsApp(order.customer_phone!, orderStatusMessage(order, order.status))} title="WhatsApp">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(order.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!orders || orders.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No orders yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card className="glass-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages?.map((msg) => (
                      <TableRow key={msg.id} className={!msg.is_read ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium text-sm">{msg.customer_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {msg.customer_phone || msg.customer_email || "—"}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm line-clamp-2">{msg.message}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleMessageRead.mutate({ id: msg.id, is_read: !msg.is_read })}
                              title={msg.is_read ? "Mark unread" : "Mark read"}
                            >
                              {msg.is_read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteMessage.mutate(msg.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!messages || messages.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No messages yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteOrder.mutate(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        title="স্থায়ীভাবে ডিলিট করুন"
      />

      <GenerateInvoiceDialog
        order={invoiceOrder}
        open={!!invoiceOrder}
        onOpenChange={(open) => !open && setInvoiceOrder(null)}
      />
    </>
);
}
