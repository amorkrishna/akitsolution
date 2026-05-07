import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, DollarSign, TrendingUp, TrendingDown, Trash2, Clock, CheckCircle, Search, Filter, CalendarIcon, X, Download, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isWithinInterval, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const SERVICE_CATEGORIES = [
  "CCTV Installation",
  "CCTV Repair",
  "CCTV Maintenance",
  "Networking Setup",
  "Network Troubleshooting",
  "Computer Repair",
  "Computer Maintenance",
  "Laptop Repair",
  "Software Installation",
  "Server Setup",
  "Server Maintenance",
  "Attendance Device Setup",
  "Attendance Device Repair",
  "Intercom Setup",
  "Fire Alarm Installation",
  "Fire Alarm Maintenance",
  "IP Phone Setup",
  "PA System",
  "Gate Barrier",
  "Access Control",
  "DVR/NVR Setup",
  "Hard Disk Replacement",
  "Cable Wiring",
  "UPS Installation",
  "Printer Setup",
  "Data Recovery",
  "AMC (Annual Maintenance)",
  "Other",
];

interface ServicingRecord {
  id: string;
  description: string;
  client_name: string;
  category: string;
  amount: number;
  cost: number;
  status: string;
  service_date: string;
  notes: string | null;
  created_at: string;
}

export default function Servicing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServicingRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    description: "",
    client_name: "",
    category: "CCTV Installation",
    amount: 0,
    cost: 0,
    status: "pending",
    service_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const { data: records } = useQuery({
    queryKey: ["servicing"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("servicing")
        .select("*")
        .order("service_date", { ascending: false });
      return (data || []) as ServicingRecord[];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name, phone, address").order("name");
      return data || [];
    },
  });

  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("servicing").insert({
        description: form.description,
        client_name: form.client_name,
        category: form.category,
        amount: form.amount,
        cost: form.cost,
        status: form.status,
        service_date: form.service_date,
        notes: form.notes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicing"] });
      toast({ title: editingRecord ? "Record updated" : "Servicing record added" });
      setDialogOpen(false);
      setEditingRecord(null);
      setForm({ description: "", client_name: "", category: "CCTV Installation", amount: 0, cost: 0, status: "pending", service_date: new Date().toISOString().split("T")[0], notes: "" });
    },
    onError: () => toast({ title: "Error saving record", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingRecord) return;
      const { error } = await (supabase as any).from("servicing").update({
        description: form.description,
        client_name: form.client_name,
        category: form.category,
        amount: form.amount,
        cost: form.cost,
        status: form.status,
        service_date: form.service_date,
        notes: form.notes || null,
      } as any).eq("id", editingRecord.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicing"] });
      toast({ title: "Record updated" });
      setDialogOpen(false);
      setEditingRecord(null);
      setForm({ description: "", client_name: "", category: "CCTV Installation", amount: 0, cost: 0, status: "pending", service_date: new Date().toISOString().split("T")[0], notes: "" });
    },
    onError: () => toast({ title: "Error updating record", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("servicing").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicing"] });
      toast({ title: "Record deleted" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (rec: ServicingRecord) => {
      const newStatus = rec.status === "completed" ? "pending" : "completed";
      const { error } = await (supabase as any).from("servicing").update({ status: newStatus }).eq("id", rec.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicing"] });
    },
  });

  const filteredRecords = records?.filter(r => {
    const matchesSearch = !searchQuery || 
      r.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || r.category === filterCategory;
    const matchesDate = (() => {
      if (!dateFrom && !dateTo) return true;
      const d = parseISO(r.service_date);
      if (dateFrom && dateTo) return isWithinInterval(d, { start: dateFrom, end: dateTo });
      if (dateFrom) return d >= dateFrom;
      if (dateTo) return d <= dateTo;
      return true;
    })();
    return matchesSearch && matchesCategory && matchesDate;
  });

  const totalEarned = filteredRecords?.filter(r => r.status === "completed").reduce((s, r) => s + Number(r.amount), 0) || 0;
  const totalSpent = filteredRecords?.reduce((s, r) => s + Number(r.cost), 0) || 0;
  const netProfit = totalEarned - totalSpent;
  const pendingCount = filteredRecords?.filter(r => r.status === "pending").length || 0;

  const exportCSV = () => {
    if (!filteredRecords?.length) return;
    const headers = ["Date", "Client", "Description", "Category", "Income", "Cost", "Status", "Notes"];
    const rows = filteredRecords.map(r => [
      r.service_date, r.client_name, r.description, r.category,
      r.amount, r.cost, r.status, r.notes || ""
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `servicing-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${filteredRecords.length} records` });
  };

  const openEdit = (rec: ServicingRecord) => {
    setEditingRecord(rec);
    setForm({
      description: rec.description,
      client_name: rec.client_name,
      category: rec.category,
      amount: rec.amount,
      cost: rec.cost,
      status: rec.status,
      service_date: rec.service_date,
      notes: rec.notes || "",
    });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingRecord(null);
    setForm({ description: "", client_name: "", category: "CCTV Installation", amount: 0, cost: 0, status: "pending", service_date: new Date().toISOString().split("T")[0], notes: "" });
    setDialogOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredRecords) return;
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any).from("servicing").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicing"] });
      toast({ title: `${selectedIds.size} records deleted` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await (supabase as any).from("servicing").update({ status }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicing"] });
      toast({ title: `${selectedIds.size} records updated` });
      setSelectedIds(new Set());
    },
  });

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    completed: "bg-success/10 text-success border-success/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
      <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Servicing</h1>
            <p className="text-muted-foreground text-sm">Track service income and costs</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={!filteredRecords?.length}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Service</Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-success" /></div>
              <div><p className="text-xs text-muted-foreground">Service Income</p><p className="text-lg font-bold">৳{totalEarned.toLocaleString()}</p></div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><TrendingDown className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-xs text-muted-foreground">Service Cost</p><p className="text-lg font-bold">৳{totalSpent.toLocaleString()}</p></div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${netProfit >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}><DollarSign className={`h-5 w-5 ${netProfit >= 0 ? "text-primary" : "text-destructive"}`} /></div>
              <div><p className="text-xs text-muted-foreground">Net Profit</p><p className={`text-lg font-bold ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>৳{netProfit.toLocaleString()}</p></div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center"><Clock className="h-5 w-5 text-warning" /></div>
              <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold">{pendingCount}</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full sm:w-[150px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateFrom ? format(dateFrom, "dd MMM yy") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full sm:w-[150px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateTo ? format(dateTo, "dd MMM yy") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status: "completed" })}>
              <CheckCircle className="h-4 w-4 mr-1" /> Mark Completed
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status: "pending" })}>
              <Clock className="h-4 w-4 mr-1" /> Mark Pending
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>
        )}

        {/* Records Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={!!filteredRecords?.length && selectedIds.size === filteredRecords.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Income</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords?.map((rec) => (
                  <TableRow key={rec.id} className={selectedIds.has(rec.id) ? "bg-muted/30" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(rec.id)}
                        onCheckedChange={() => toggleSelect(rec.id)}
                      />
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(rec.service_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{rec.client_name}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{rec.description}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{rec.category}</Badge></TableCell>
                    <TableCell className="font-medium text-success">৳{Number(rec.amount).toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-destructive">৳{Number(rec.cost).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor[rec.status] || ""}>{rec.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rec)} title="Edit">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatusMutation.mutate(rec)} title={rec.status === "completed" ? "Mark Pending" : "Mark Completed"}>
                          {rec.status === "completed" ? <CheckCircle className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-warning" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(rec.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredRecords || filteredRecords.length === 0) && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">{searchQuery || filterCategory !== "all" ? "No matching records found" : "No servicing records yet"}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Service Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingRecord ? "Edit Servicing Record" : "Add Servicing Record"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Client Name</Label>
              <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal" role="combobox">
                    {form.client_name || "Select or type client..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search clients..." onValueChange={(v) => setForm({ ...form, client_name: v })} />
                    <CommandList>
                      <CommandEmpty>
                        <span className="text-xs text-muted-foreground">No match — type a new name above</span>
                      </CommandEmpty>
                      <CommandGroup heading="Existing Clients">
                        {clients?.map((c) => (
                          <CommandItem key={c.id} value={c.name} onSelect={() => { setForm({ ...form, client_name: c.name }); setClientPopoverOpen(false); }}>
                            <div>
                              <p className="font-medium text-sm">{c.name}</p>
                              {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Service description" /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Service Charge (৳)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div><Label>Cost/Expense (৳)</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes (optional)</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button className="w-full" disabled={!form.description || !form.client_name} onClick={() => editingRecord ? updateMutation.mutate() : addMutation.mutate()}>{editingRecord ? "Update Record" : "Add Record"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this servicing record? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Records</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete {selectedIds.size} servicing records? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
);
}
