import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { format } from "date-fns";

export default function Expenses() {
  const { toast } = useToast();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: 0,
    category: "General",
    expense_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Income from paid invoices (service revenue)
  const { data: paidInvoices } = useQuery({
    queryKey: ["invoices-paid"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("total, issue_date, invoice_number, clients(name)").eq("status", "paid").order("issue_date", { ascending: false });
      return data || [];
    },
  });

  // Income from paid sales
  const { data: paidSales } = useQuery({
    queryKey: ["sales-paid"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("total, sale_date, products(name), clients(name)").eq("payment_status", "paid").order("sale_date", { ascending: false });
      return data || [];
    },
  });

  // All expenses
  const { data: expenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      return data || [];
    },
  });

  const totalIncome = (paidInvoices?.reduce((s, i) => s + Number(i.total), 0) || 0) + (paidSales?.reduce((s, i) => s + Number(i.total), 0) || 0);
  const totalExpenses = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;
  const netBalance = totalIncome - totalExpenses;

  const addExpense = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("expenses").insert({ ...expenseForm, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setExpenseOpen(false);
      setExpenseForm({ description: "", amount: 0, category: "General", expense_date: new Date().toISOString().split("T")[0], notes: "" });
      toast({ title: "Expense added" });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Expense deleted" });
    },
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expenses & Revenue</h1>
            <p className="text-muted-foreground text-sm">Track income and payments</p>
          </div>
          <Button onClick={() => setExpenseOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="text-lg font-bold text-success">৳{totalIncome.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-bold text-destructive">৳{totalExpenses.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Balance</p>
                <p className={`text-lg font-bold ${netBalance >= 0 ? "text-success" : "text-destructive"}`}>৳{netBalance.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> All Expenses</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{format(new Date(e.expense_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{e.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.category}</TableCell>
                    <TableCell className="font-semibold text-destructive">৳{Number(e.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(e.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!expenses || expenses.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No expenses recorded</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Expense Dialog */}
        <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Description *</Label><Input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount (৳) *</Label><Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} /></div>
                <div><Label>Date</Label><Input type="date" value={expenseForm.expense_date} onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} /></div>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["General", "Rent", "Salary", "Equipment", "Transport", "Utilities", "Marketing", "Other"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={() => addExpense.mutate()} disabled={!expenseForm.description || expenseForm.amount <= 0}>Add Expense</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteExpense.mutate(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        title="স্থায়ীভাবে ডিলিট করুন"
      />
    </>
);
}
