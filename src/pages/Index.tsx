import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Users, FolderKanban, FileText, Package, DollarSign, ShoppingCart, TrendingUp, Clock, AlertCircle, CalendarDays, ArrowUpRight, ArrowDownRight, Wallet, UserPlus, ClipboardList, MessageCircle, Bot, Boxes, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";

import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: async () => (await supabase.from("clients").select("*")).data || [] });
  const { data: invoices } = useQuery({ queryKey: ["invoices"], queryFn: async () => (await supabase.from("invoices").select("*, clients(name)").order("created_at", { ascending: false })).data || [] });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: async () => (await supabase.from("products").select("*")).data || [] });
  const { data: orders } = useQuery({ queryKey: ["store-orders"], queryFn: async () => (await supabase.from("store_orders").select("*").order("created_at", { ascending: false })).data || [] });
  const { data: sales } = useQuery({ queryKey: ["sales"], queryFn: async () => (await supabase.from("sales").select("*, products(name), clients(name)").order("sale_date", { ascending: false })).data || [] });
  const { data: quotations } = useQuery({ queryKey: ["quotations"], queryFn: async () => (await supabase.from("quotations").select("*, clients(name)").order("created_at", { ascending: false })).data || [] });
  const { data: expenses } = useQuery({ queryKey: ["expenses-dashboard"], queryFn: async () => (await supabase.from("expenses").select("*")).data || [] });
  const { data: purchases } = useQuery({ queryKey: ["purchases-dashboard"], queryFn: async () => (await supabase.from("purchases").select("*")).data || [] });
  const { data: leads } = useQuery({ queryKey: ["leads-dashboard"], queryFn: async () => (await supabase.from("leads").select("*")).data || [] });
  const { data: serviceRequests } = useQuery({ queryKey: ["service-requests-dashboard"], queryFn: async () => (await supabase.from("service_requests").select("*")).data || [] });
  const { data: aiChats } = useQuery({ queryKey: ["ai-chats-dashboard"], queryFn: async () => (await supabase.from("ai_chat_sessions").select("*").order("updated_at", { ascending: false }).limit(5)).data || [] });
  const { data: storeMessages } = useQuery({ queryKey: ["store-messages-dashboard"], queryFn: async () => (await supabase.from("store_messages").select("*").eq("is_read", false)).data || [] });

  const totalRevenue = invoices?.filter(i => i.status === "paid").reduce((sum, i) => sum + Number(i.total), 0) || 0;
  const pendingOrders = orders?.filter(o => o.status === "pending").length || 0;
  const lowStockProducts = products?.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length || 0;
  const outOfStockProducts = products?.filter(p => p.stock_quantity === 0).length || 0;
  const storeOrderRevenue = orders?.filter(o => o.status === "completed").reduce((sum, o) => sum + Number(o.item_price) * o.quantity, 0) || 0;

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const todaySalesRevenue = sales?.filter(s => s.sale_date === todayStr).reduce((sum, s) => sum + Number(s.total), 0) || 0;
  const todayPaidInvoices = invoices?.filter(i => i.status === "paid" && format(new Date(i.issue_date), "yyyy-MM-dd") === todayStr).reduce((sum, i) => sum + Number(i.total), 0) || 0;
  const todayIncome = todaySalesRevenue + todayPaidInvoices;
  const todayExpenses = expenses?.filter(e => e.expense_date === todayStr).reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const todayPurchases = purchases?.filter(p => p.purchase_date === todayStr).reduce((sum, p) => sum + Number(p.total_cost), 0) || 0;
  const todaySpending = todayExpenses + todayPurchases;
  const todayProfit = todayIncome - todaySpending;

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    in_progress: "bg-info/10 text-info border-info/20",
    completed: "bg-success/10 text-success border-success/20",
    paid: "bg-success/10 text-success border-success/20",
    draft: "bg-muted text-muted-foreground border-border",
    sent: "bg-info/10 text-info border-info/20",
    overdue: "bg-destructive/10 text-destructive border-destructive/20",
    new: "bg-primary/10 text-primary border-primary/20",
    confirmed: "bg-info/10 text-info border-info/20",
  };

  return (
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Banner */}
        <WelcomeBanner />

        {/* Top Stats Row - auto-scales from 2 cols on mobile to 8 on xl */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
          <StatCard title="Clients" value={clients?.length || 0} icon={Users} />
          <StatCard title="New Leads" value={leads?.filter(l => l.status === "new").length || 0} icon={UserPlus} trend={`${leads?.filter(l => l.status === "new").length || 0} active`} trendUp />
          <StatCard title="Service Req." value={serviceRequests?.filter(r => r.status === "pending").length || 0} icon={ClipboardList} />
          <StatCard title="Pending Orders" value={pendingOrders} icon={ShoppingCart} trend={pendingOrders > 0 ? "Needs attention" : "All clear"} trendUp={pendingOrders === 0} />
          <StatCard title="Products" value={products?.length || 0} icon={Package} />
          <StatCard title="Low Stock" value={lowStockProducts} icon={AlertCircle} trend={lowStockProducts > 0 ? `${outOfStockProducts} out` : "OK"} trendUp={lowStockProducts === 0} />
          <StatCard title="Invoices" value={invoices?.length || 0} icon={FileText} />
          <StatCard title="Revenue" value={`৳${totalRevenue.toLocaleString()}`} icon={DollarSign} trend="Total paid" trendUp />
        </div>

        {/* Today's Profit + Store Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <Card className="glass-card border-primary/20 md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Today's Profit — {format(today, "dd MMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <div className="rounded-xl bg-success/5 border border-success/20 p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-7 w-7 rounded-lg bg-success/10 flex items-center justify-center">
                      <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">Income</span>
                  </div>
                  <p className="text-lg font-bold text-success">৳{todayIncome.toLocaleString()}</p>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[9px] text-muted-foreground">Sales: ৳{todaySalesRevenue.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Invoices: ৳{todayPaidInvoices.toLocaleString()}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">Spending</span>
                  </div>
                  <p className="text-lg font-bold text-destructive">৳{todaySpending.toLocaleString()}</p>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[9px] text-muted-foreground">Expenses: ৳{todayExpenses.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Purchases: ৳{todayPurchases.toLocaleString()}</p>
                  </div>
                </div>

                <div className={`rounded-xl p-3 border hover:shadow-md transition-shadow ${todayProfit >= 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${todayProfit >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                      <Wallet className={`h-3.5 w-3.5 ${todayProfit >= 0 ? "text-success" : "text-destructive"}`} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">Net Profit</span>
                  </div>
                  <p className={`text-xl font-black ${todayProfit >= 0 ? "text-success" : "text-destructive"}`}>
                    {todayProfit < 0 ? "-" : ""}৳{Math.abs(todayProfit).toLocaleString()}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-1.5">
                    {todayProfit >= 0 ? "Profitable day ✅" : "Negative balance ⚠️"}
                  </p>
                </div>

                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">Today's Activity</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Sales</span>
                      <span className="font-semibold">{sales?.filter(s => s.sale_date === todayStr).length || 0}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Orders</span>
                      <span className="font-semibold">{orders?.filter(o => format(new Date(o.created_at), "yyyy-MM-dd") === todayStr).length || 0}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Expenses</span>
                      <span className="font-semibold">{expenses?.filter(e => e.expense_date === todayStr).length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Store Performance */}
          <Card className="glass-card border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-accent" />
                Store Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl bg-accent/5 border border-accent/20 p-3">
                <p className="text-[10px] text-muted-foreground font-medium">Store Revenue</p>
                <p className="text-xl font-black text-accent">৳{storeOrderRevenue.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{orders?.filter(o => o.status === "completed").length || 0} completed orders</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-warning/5 border border-warning/20 p-2.5 text-center hover:shadow-sm transition-shadow">
                  <p className="text-lg font-bold text-warning">{pendingOrders}</p>
                  <p className="text-[9px] text-muted-foreground">Pending</p>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-center hover:shadow-sm transition-shadow">
                  <p className="text-lg font-bold text-primary">{storeMessages?.length || 0}</p>
                  <p className="text-[9px] text-muted-foreground">Unread Msgs</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate("/orders")}>
                <ShoppingCart className="h-3 w-3 mr-1.5" /> View All Orders
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart + Activity Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <RevenueChart sales={sales || []} invoices={invoices || []} />
          <ActivityTimeline
            orders={orders || []}
            invoices={invoices || []}
            sales={sales || []}
            leads={leads || []}
            serviceRequests={serviceRequests || []}
          />
        </div>


        {/* Data Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Recent Orders */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /> Recent Orders</CardTitle>
                <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => navigate("/orders")}>View All →</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {orders?.slice(0, 5).map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{o.item_name}</p>
                    <p className="text-[10px] text-muted-foreground">{o.customer_name} • ৳{(Number(o.item_price) * o.quantity).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ml-2 ${statusColor[o.status] || ""}`}>{o.status}</Badge>
                </div>
              ))}
              {(!orders || orders.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">No orders yet</p>}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Recent Invoices</CardTitle>
                <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => navigate("/invoices")}>View All →</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoices?.slice(0, 5).map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{inv.invoice_number}</p>
                    <p className="text-[10px] text-muted-foreground">{(inv as any).clients?.name || "—"} • {format(new Date(inv.issue_date), "dd MMM")}</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-xs font-semibold">৳{Number(inv.total).toLocaleString()}</p>
                    <Badge variant="outline" className={`text-[9px] ${statusColor[inv.status] || ""}`}>{inv.status}</Badge>
                  </div>
                </div>
              ))}
              {(!invoices || invoices.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">No invoices yet</p>}
            </CardContent>
          </Card>

          {/* AI Chat Leads */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-purple-500" /> AI Chat Leads</CardTitle>
                <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => navigate("/ai-chats")}>View All →</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {aiChats?.slice(0, 4).map(chat => (
                <div key={chat.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{chat.customer_name || "Unknown Visitor"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {chat.customer_phone ? `📞 ${chat.customer_phone}` : "No phone"} • {format(new Date(chat.updated_at), "dd MMM HH:mm")}
                    </p>
                  </div>
                  {chat.customer_phone && (
                    <Badge variant="outline" className="text-[9px] bg-success/10 text-success border-success/20">📞 Lead</Badge>
                  )}
                </div>
              ))}
              {(!aiChats || aiChats.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">No AI chats yet</p>}
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Recent Sales</CardTitle>
                <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => navigate("/sales")}>View All →</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {sales?.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{(s as any).products?.name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{(s as any).clients?.name || "Walk-in"} • Qty: {s.quantity}</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-xs font-semibold">৳{Number(s.total).toLocaleString()}</p>
                    <Badge variant="outline" className={`text-[9px] ${statusColor[s.payment_status] || ""}`}>{s.payment_status}</Badge>
                  </div>
                </div>
              ))}
              {(!sales || sales.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">No sales yet</p>}
            </CardContent>
          </Card>

          {/* Recent Service Requests */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> Recent Service Requests</CardTitle>
                <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => navigate("/service-requests")}>View All →</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {serviceRequests?.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{req.category || "Service Request"}</p>
                    <p className="text-[10px] text-muted-foreground">{req.customer_name} • {format(new Date(req.created_at), "dd MMM")}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ml-2 ${statusColor[req.status] || ""}`}>{req.status}</Badge>
                </div>
              ))}
              {(!serviceRequests || serviceRequests.length === 0) && <p className="text-xs text-muted-foreground py-4 text-center">No service requests</p>}
            </CardContent>
          </Card>

          {/* Stock Alerts */}
          <Card className="glass-card md:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" /> Stock Alerts
                  {(lowStockProducts + outOfStockProducts) > 0 && (
                    <Badge variant="destructive" className="text-[9px] px-1.5">{lowStockProducts + outOfStockProducts}</Badge>
                  )}
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => navigate("/inventory")}>View Inventory →</Button>
              </div>
            </CardHeader>
            <CardContent>
              {products && products.filter(p => p.stock_quantity <= 5).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {products.filter(p => p.stock_quantity <= 5).slice(0, 6).map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/30 transition-colors">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${p.stock_quantity === 0 ? "bg-destructive/10" : "bg-warning/10"}`}>
                        <Package className={`h-4 w-4 ${p.stock_quantity === 0 ? "text-destructive" : "text-warning"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{p.name}</p>
                        <p className={`text-[10px] font-semibold ${p.stock_quantity === 0 ? "text-destructive" : "text-warning"}`}>
                          {p.stock_quantity === 0 ? "Out of Stock" : `${p.stock_quantity} left`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">All products are well stocked ✅</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
);
}
