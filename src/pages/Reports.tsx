import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Download, FileText, TrendingUp, Users, Package, CalendarDays } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";
import { exportToCSV, formatCurrency } from "@/lib/exportUtils";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6", "#f97316", "hsl(var(--destructive))"];

export default function Reports() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState("12m");

  const { data: sales } = useQuery({
    queryKey: ["report-sales"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("total, sale_date, quantity, products(name, category), clients(name)").order("sale_date", { ascending: false });
      return data || [];
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["report-invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("total, issue_date, status, clients(name)").order("issue_date", { ascending: false });
      return data || [];
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ["report-expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["report-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data || [];
    },
  });

  const months = dateRange === "12m" ? 12 : dateRange === "6m" ? 6 : 3;

  // P&L monthly data
  const plData = useMemo(() => {
    const data: { month: string; income: number; expense: number; profit: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const label = format(d, "MMM yy");
      const inc = (sales || []).filter((s: any) => { const sd = parseISO(s.sale_date); return sd >= start && sd <= end; }).reduce((s: number, r: any) => s + Number(r.total), 0)
        + (invoices || []).filter((inv: any) => inv.status === "paid").filter((inv: any) => { const id = parseISO(inv.issue_date); return id >= start && id <= end; }).reduce((s: number, r: any) => s + Number(r.total), 0);
      const exp = (expenses || []).filter((e: any) => { const ed = parseISO(e.expense_date); return ed >= start && ed <= end; }).reduce((s: number, e: any) => s + Number(e.amount), 0);
      data.push({ month: label, income: inc, expense: exp, profit: inc - exp });
    }
    return data;
  }, [sales, invoices, expenses, months]);

  // Client revenue
  const clientRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    (sales || []).forEach((s: any) => {
      const name = s.clients?.name || "Walk-in";
      map[name] = (map[name] || 0) + Number(s.total);
    });
    (invoices || []).filter((i: any) => i.status === "paid").forEach((inv: any) => {
      const name = inv.clients?.name || "Walk-in";
      map[name] = (map[name] || 0) + Number(inv.total);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [sales, invoices]);

  // Product performance
  const productPerf = useMemo(() => {
    const map: Record<string, { revenue: number; qty: number }> = {};
    (sales || []).forEach((s: any) => {
      const name = s.products?.name || "Unknown";
      if (!map[name]) map[name] = { revenue: 0, qty: 0 };
      map[name].revenue += Number(s.total);
      map[name].qty += Number(s.quantity || 1);
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 15);
  }, [sales]);

  // Totals
  const totalIncome = plData.reduce((s, d) => s + d.income, 0);
  const totalExpense = plData.reduce((s, d) => s + d.expense, 0);
  const totalProfit = totalIncome - totalExpense;

  const handleExportPL = () => exportToCSV(plData, "profit_loss_report");
  const handleExportClients = () => exportToCSV(clientRevenue, "client_revenue_report");
  const handleExportProducts = () => exportToCSV(productPerf.map(p => ({ Product: p.name, Revenue: p.revenue, Quantity: p.qty })), "product_performance");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("page.reports.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("page.reports.subtitle")}</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[120px]"><CalendarDays className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3m">{t("date.3m")}</SelectItem>
            <SelectItem value="6m">{t("date.6m")}</SelectItem>
            <SelectItem value="12m">{t("date.12m")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-success" /><span className="text-xs text-muted-foreground">{t("page.revenue.total_income")}</span></div>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">{t("page.revenue.total_expense")}</span></div>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card className={`glass-card ${totalProfit >= 0 ? "border-success/20" : "border-destructive/20"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs text-muted-foreground">{t("page.revenue.net_profit")}</span></div>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(totalProfit)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pl">
        <TabsList className="flex-wrap">
          <TabsTrigger value="pl"><FileText className="h-3.5 w-3.5 mr-1" />{t("page.reports.profit_loss")}</TabsTrigger>
          <TabsTrigger value="clients"><Users className="h-3.5 w-3.5 mr-1" />{t("page.reports.client_revenue")}</TabsTrigger>
          <TabsTrigger value="products"><Package className="h-3.5 w-3.5 mr-1" />{t("page.reports.product_performance")}</TabsTrigger>
        </TabsList>

        {/* P&L Tab */}
        <TabsContent value="pl" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExportPL}><Download className="h-3.5 w-3.5 mr-1" />{t("common.export_csv")}</Button>
          </div>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={plData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Legend />
                  <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t("page.revenue.income")} />
                  <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name={t("page.revenue.expense")} />
                  <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name={t("page.revenue.net_profit")} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("page.reports.monthly_summary")}</TableHead>
                    <TableHead>{t("page.revenue.income")}</TableHead>
                    <TableHead>{t("page.revenue.expense")}</TableHead>
                    <TableHead>{t("page.revenue.net_profit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plData.map(d => (
                    <TableRow key={d.month}>
                      <TableCell className="font-medium">{d.month}</TableCell>
                      <TableCell className="text-success">{formatCurrency(d.income)}</TableCell>
                      <TableCell className="text-destructive">{formatCurrency(d.expense)}</TableCell>
                      <TableCell className={d.profit >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>{formatCurrency(d.profit)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>{t("common.total")}</TableCell>
                    <TableCell className="text-success">{formatCurrency(totalIncome)}</TableCell>
                    <TableCell className="text-destructive">{formatCurrency(totalExpense)}</TableCell>
                    <TableCell className={totalProfit >= 0 ? "text-success" : "text-destructive"}>{formatCurrency(totalProfit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Revenue Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExportClients}><Download className="h-3.5 w-3.5 mr-1" />{t("common.export_csv")}</Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={clientRevenue} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name={t("page.revenue.income")} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-4">
                {clientRevenue.length ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie data={clientRevenue} cx="50%" cy="50%" outerRadius={120} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {clientRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-16">{t("common.no_data")}</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Product Performance Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExportProducts}><Download className="h-3.5 w-3.5 mr-1" />{t("common.export_csv")}</Button>
          </div>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={productPerf}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} angle={-35} textAnchor="end" height={80} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t("page.revenue.income")} />
                  <Bar dataKey="qty" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Qty" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("page.revenue.income")}</TableHead>
                    <TableHead>Qty Sold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productPerf.map(p => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-success">{formatCurrency(p.revenue)}</TableCell>
                      <TableCell>{p.qty}</TableCell>
                    </TableRow>
                  ))}
                  {!productPerf.length && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{t("common.no_data")}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
