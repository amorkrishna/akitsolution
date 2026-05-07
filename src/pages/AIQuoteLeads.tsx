import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Phone, MessageSquare, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type Lead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  source: string | null;
  service_type: string | null;
};

const STATUSES = ["new", "contacted", "quoted", "converted", "lost"];

const statusColor: Record<string, string> = {
  new: "bg-info/10 text-info border-info/30",
  contacted: "bg-warning/10 text-warning border-warning/30",
  quoted: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  converted: "bg-success/10 text-success border-success/30",
  lost: "bg-destructive/10 text-destructive border-destructive/30",
};

function extractTotal(notes: string | null): number {
  if (!notes) return 0;
  const m = notes.match(/Subtotal\s*৳?\s*([\d,]+(?:\.\d+)?)/i);
  return m ? parseFloat(m[1].replace(/,/g, "")) : 0;
}

export default function AIQuoteLeads() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ["ai-quote-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .or("source.eq.AI Quote Builder,service_type.eq.AI Quote")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Lead[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-quote-leads"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-quote-leads"] });
      toast.success("Lead deleted");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return leads.filter(l => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        (l.phone || "").toLowerCase().includes(q) ||
        (l.message || "").toLowerCase().includes(q) ||
        (l.notes || "").toLowerCase().includes(q)
      );
    });
  }, [leads, search, statusFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter(l => l.status === "new").length;
    const contacted = leads.filter(l => l.status === "contacted").length;
    const converted = leads.filter(l => l.status === "converted").length;
    const totalValue = leads.reduce((s, l) => s + extractTotal(l.notes), 0);
    return { total, newCount, contacted, converted, totalValue };
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> AI Smart Quote Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Customers who built quotes via the AI Smart Quote Builder.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Leads</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">New</p><p className="text-2xl font-bold text-info">{stats.newCount}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Contacted</p><p className="text-2xl font-bold text-warning">{stats.contacted}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Converted</p><p className="text-2xl font-bold text-success">{stats.converted}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pipeline Value</p><p className="text-2xl font-bold">৳{stats.totalValue.toLocaleString()}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Search name, phone, requirement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <CardTitle className="text-base ml-auto">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No AI Smart Quote leads yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="max-w-[300px]">Requirement</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(lead => {
                    const total = extractTotal(lead.notes);
                    return (
                      <TableRow key={lead.id} className="cursor-pointer" onClick={() => setViewing(lead)}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>
                          {lead.phone ? (
                            <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-primary hover:underline">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </a>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">{lead.message || "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{total > 0 ? `৳${total.toLocaleString()}` : "—"}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select value={lead.status} onValueChange={(v) => updateStatus.mutate({ id: lead.id, status: v })}>
                            <SelectTrigger className={`w-[120px] h-7 text-xs capitalize ${statusColor[lead.status] || ""}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {lead.phone && (
                              <Button asChild size="icon" variant="ghost" className="h-7 w-7">
                                <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                                  <MessageSquare className="h-3.5 w-3.5 text-success" />
                                </a>
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(lead.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> {viewing?.name}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{viewing.phone || "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Status</p><Badge variant="outline" className={`capitalize ${statusColor[viewing.status]}`}>{viewing.status}</Badge></div>
                <div><p className="text-muted-foreground text-xs">Date</p><p className="font-medium">{new Date(viewing.created_at).toLocaleString()}</p></div>
                <div><p className="text-muted-foreground text-xs">Quote Total</p><p className="font-semibold text-primary">৳{extractTotal(viewing.notes).toLocaleString()}</p></div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Customer Requirement</p>
                <div className="bg-muted/40 rounded-lg p-3 text-sm whitespace-pre-wrap">{viewing.message || "—"}</div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">AI Generated Quote</p>
                <div className="bg-muted/40 rounded-lg p-3 text-sm whitespace-pre-wrap font-mono text-xs">{viewing.notes || "—"}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => deleteId && deleteLead.mutate(deleteId)}
        title="Delete AI Quote Lead?"
        description="This permanently removes the lead and its generated quote details."
      />
    </div>
  );
}
