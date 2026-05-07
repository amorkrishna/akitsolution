import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, BarChart3, PieChart as PieIcon, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6", "#f97316"];

export default function Revenue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [dateRange, setDateRange] = useState("6m");
  const [expenseForm, setExpenseForm] = useState({
    description: "", amount: 0, category: "General",
    expense_date: new Date().toISOString().split("T")[0], notes: "",
  });

  const { data: paidSales } = useQuery({
    queryKey: ["sales-paid"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("total, sale_date, products(name), clients(name)").eq("payment_status", "paid").order("sale_date", { ascending: false });
      return data || [];
    },
  });

  const { data: paidInvoices } = useQuery({
    queryKey: ["invoices-paid"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("total, issue_date, invoice_number, clients(name)").eq("status", "paid").order("issue_date", { ascending: false });
      return data || [];
    },
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      return data || [];
    },
  });

  const { data: allSales } = useQuery({
    queryKey: ["all-sales-for-chart"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("total, sale_date, products(name)").order("sale_date", { ascending: false });
      return data || [];
    },
  });

  const createExpense = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("expenses").insert({ ...expenseForm, created_by: user?.id || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Expense recorded" });
      setExpenseOpen(false);
      setExpenseForm({ description: "", amount: 0, category: "General", expense_date: new Date().toISOString().split("T")[0], notes: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); toast({ title: "Expense deleted" }); },
  });

  const totalIncome = (paidSales?.reduce((s: number, r: any) => s + Number(r.total), 0) || 0) +
    (paidInvoices?.reduce((s: number, r: any) => s + Number(r.total), 0) || 0);
  const totalExpenses = expenses?.reduce((s: number, e: any) => s + Number(e.amount), 0) || 0;
  const netRevenue = totalIncome - totalExpenses;

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const months = dateRange === "12m" ? 12 : dateRange === "6m" ? 6 : 3;
    const data: { month: string; income: number; expense: number; profit: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const label = format(d, "MMM yy");
      const inc = (paidSales || []).filter((s: any) => { const sd = parseISO(s.sale_date); return sd >= start && sd <= end; }).reduce((s: number, r: any) => s + Number(r.total), 0)
        + (paidInvoices || []).filter((inv: any) => { const id = parseISO(inv.issue_date); return id >= start && id <= end; }).reduce((s: number, r: any) => s + Number(r.total), 0);
      const exp = (expenses || []).filter((e: any) => { const ed = parseISO(e.expense_date); return ed >= start && ed <= end; }).reduce((s: number, e: any) => s + Number(e.amount), 0);
      data.push({ month: label, income: inc, expense: exp, profit: inc - exp });
    }
    return data;
  }, [paidSales, paidInvoices, expenses, dateRange]);

  // Expense by category
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    (expenses || []).forEach((e: any) => { map[e.category] = (map[e.category] || 0) + Number(e.amount); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, number> = {};
    (allSales || []).forEach((s: any) => {
      const name = s.products?.name || "Unknown";
      map[name] = (map[name] || 0) + Number(s.total);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [allSales]);

  const categories = ["General", "Salary", "Rent", "Equipment", "Utilities", "Marketing", "Transport", "Other"];

  const todayIncome = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return (paidSales || []).filter((s: any) => s.sale_date === today).reduce((s: number, r: any) => s + Number(r.total), 0);
  }, [paidSales]);

  const pendingPayments = useMemo(() => {
    return 0; // Can be extended with unpaid invoices
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Dashboard</h1>
          <p className="text-muted-foreground text-sm">বিক্রি, খরচ ও লাভ-ক্ষতির সম্পূর্ণ বিশ্লেষণ</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[120px]"><CalendarDays className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">৩ মাস</SelectItem>
              <SelectItem value="6m">৬ মাস</SelectItem>
              <SelectItem value="12m">১ বছর</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Add Expense</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Description</Label><Input value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} /></div>
                <div><Label>Amount (৳)</Label><Input type="number" min={0} value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: +e.target.value })} /></div>
                <div><Label>Category</Label>
                  <Select value={expenseForm.category} onValueChange={v => setExpenseForm({ ...expenseForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="date" value={expenseForm.expense_date} onChange={e => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={expenseForm.notes} onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })} /></div>
                <Button className="w-full" onClick={() => createExpense.mutate()} disabled={createExpense.isPending || !expenseForm.description}>
                  {createExpense.isPending ? "Saving..." : "Record Expense"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-success" /><span className="text-xs text-muted-foreground">মোট আয়</span></div>
            <p className="text-xl font-bold text-success">৳{totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingDown className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">মোট খরচ</span></div>
            <p className="text-xl font-bold text-destructive">৳{totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={`glass-card ${netRevenue >= 0 ? "border-success/20" : "border-destructive/20"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4" /><span className="text-xs text-muted-foreground">নেট লাভ</span></div>
            <p className={`text-xl font-bold ${netRevenue >= 0 ? "text-success" : "text-destructive"}`}>৳{netRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><BarChart3 className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">আজকের আয়</span></div>
            <p className="text-xl font-bold text-primary">৳{todayIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue vs Expense */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />মাসিক আয় vs খরচ</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="আয়" />
                <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="খরচ" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profit Trend */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" />লাভ/ক্ষতি ট্রেন্ড</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} name="লাভ" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense by Category Pie */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><PieIcon className="h-4 w-4 text-primary" />ক্যাটাগরি অনুযায়ী খরচ</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-16">কোনো খরচ নেই</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={expenseByCategory} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {expenseByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />সবচেয়ে বেশি বিক্রি</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-16">কোনো বিক্রি ডেটা নেই</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="বিক্রি (৳)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>
        <TabsContent value="income">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Income from Sales & Invoices</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Details</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {paidSales?.map((s: any, i: number) => (
                    <TableRow key={`sale-${i}`}><TableCell className="text-sm font-medium">Sale</TableCell><TableCell className="text-sm">{s.products?.name || "—"}</TableCell><TableCell className="text-sm">{s.clients?.name || "—"}</TableCell><TableCell className="text-sm">{format(new Date(s.sale_date), "dd MMM yyyy")}</TableCell><TableCell className="text-sm font-medium text-success">৳{Number(s.total).toLocaleString()}</TableCell></TableRow>
                  ))}
                  {paidInvoices?.map((inv: any, i: number) => (
                    <TableRow key={`inv-${i}`}><TableCell className="text-sm font-medium">Invoice</TableCell><TableCell className="text-sm">{inv.invoice_number}</TableCell><TableCell className="text-sm">{inv.clients?.name || "—"}</TableCell><TableCell className="text-sm">{format(new Date(inv.issue_date), "dd MMM yyyy")}</TableCell><TableCell className="text-sm font-medium text-success">৳{Number(inv.total).toLocaleString()}</TableCell></TableRow>
                  ))}
                  {(!paidSales?.length && !paidInvoices?.length) && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No income recorded yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expenses">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Expenses</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Amount</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {expensesLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                    : expenses?.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expenses</TableCell></TableRow>
                    : expenses?.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{format(new Date(e.expense_date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-sm font-medium">{e.description}</TableCell>
                        <TableCell className="text-sm">{e.category}</TableCell>
                        <TableCell className="text-sm font-medium text-destructive">৳{Number(e.amount).toLocaleString()}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => deleteExpense.mutate(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
