import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ExternalLink, Calendar, DollarSign, Trash2, Edit, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  reviewing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  applied: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  won: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusLabels: Record<string, string> = {
  new: "New", reviewing: "Reviewing", applied: "Applied", won: "Won", lost: "Lost",
};

export default function Tenders() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({
    title: "", source_url: "", deadline: "", budget_estimate: "", status: "new", notes: "", documents_url: "",
  });

  const { data: tenders = [], isLoading } = useQuery({
    queryKey: ["tenders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        source_url: form.source_url || null,
        deadline: form.deadline || null,
        budget_estimate: form.budget_estimate ? Number(form.budget_estimate) : 0,
        status: form.status,
        notes: form.notes || null,
        documents_url: form.documents_url || null,
      };
      if (editId) {
        const { error } = await supabase.from("tenders").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenders").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      toast.success(editId ? "Tender updated" : "Tender added");
      resetForm();
    },
    onError: () => toast.error("Failed to save tender"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      toast.success("Tender deleted");
    },
  });

  const resetForm = () => {
    setForm({ title: "", source_url: "", deadline: "", budget_estimate: "", status: "new", notes: "", documents_url: "" });
    setEditId(null);
    setOpen(false);
  };

  const openEdit = (tender: any) => {
    setForm({
      title: tender.title,
      source_url: tender.source_url || "",
      deadline: tender.deadline || "",
      budget_estimate: tender.budget_estimate?.toString() || "",
      status: tender.status,
      notes: tender.notes || "",
      documents_url: tender.documents_url || "",
    });
    setEditId(tender.id);
    setOpen(true);
  };

  const filtered = tenders.filter((t: any) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const isOverdue = (deadline: string) => deadline && new Date(deadline) < new Date();

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Tender / Job Tracker</h1>
            <p className="text-sm text-muted-foreground">Track tenders, projects, and job opportunities</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Tender</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit Tender" : "Add New Tender"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title *</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Tender/Project title" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Deadline</Label>
                    <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Budget Estimate (৳)</Label>
                    <Input type="number" value={form.budget_estimate} onChange={e => setForm({ ...form, budget_estimate: e.target.value })} placeholder="0" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Source URL</Label>
                  <Input value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." className="w-full min-h-[60px] rounded-md border px-3 py-2 text-sm bg-background" />
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Add Tender"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenders..." className="pl-8" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(statusLabels).map(([k, v]) => {
            const count = tenders.filter((t: any) => t.status === k).length;
            return (
              <Card key={k} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus(k)}>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{v}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tender List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No tenders found</div>
          ) : (
            filtered.map((tender: any) => (
              <Card key={tender.id} className={`hover:shadow-md transition-shadow ${isOverdue(tender.deadline) && tender.status !== "won" && tender.status !== "lost" ? "border-red-300 dark:border-red-800" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{tender.title}</h3>
                        <Badge className={`text-[10px] ${statusColors[tender.status]}`}>{statusLabels[tender.status]}</Badge>
                        {isOverdue(tender.deadline) && tender.status !== "won" && tender.status !== "lost" && (
                          <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {tender.deadline && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(tender.deadline), "MMM dd, yyyy")}</span>
                        )}
                        {tender.budget_estimate > 0 && (
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> ৳{Number(tender.budget_estimate).toLocaleString()}</span>
                        )}
                        {tender.source_url && (
                          <a href={tender.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                            <ExternalLink className="h-3 w-3" /> Source
                          </a>
                        )}
                      </div>
                      {tender.notes && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{tender.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tender)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteMutation.mutate(tender.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteMutation.mutate(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        title="স্থায়ীভাবে ডিলিট করুন"
      />
    </>
  );
}
