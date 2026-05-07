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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, UserPlus, Phone, Mail, Calendar, Trash2, Edit2, UserCheck, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { format } from "date-fns";

const STATUSES = ["all", "new", "contacted", "quoted", "converted", "lost"];
const SERVICE_TYPES = ["General", "CCTV", "Networking", "Attendance Device", "Computer", "Server", "Servicing", "Other"];

const statusColors: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  contacted: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  quoted: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  converted: "bg-green-500/15 text-green-600 border-green-500/30",
  lost: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function Leads() {
  const { toast } = useToast();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", service_type: "General", message: "", status: "new", follow_up_date: "", notes: "", source: "website",
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveLead = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        service_type: form.service_type,
        message: form.message || null,
        status: form.status,
        follow_up_date: form.follow_up_date || null,
        notes: form.notes || null,
        source: form.source,
      };
      if (editId) {
        const { error } = await supabase.from("leads").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leads").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: editId ? "লিড আপডেট হয়েছে" : "নতুন লিড যোগ হয়েছে" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "লিড ডিলিট হয়েছে" });
    },
  });

  const convertToClient = useMutation({
    mutationFn: async (lead: any) => {
      const { error: clientErr } = await supabase.from("clients").insert({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        notes: `Converted from lead. Service: ${lead.service_type}. ${lead.message || ""}`,
      });
      if (clientErr) throw clientErr;
      const { error: updateErr } = await supabase.from("leads").update({ status: "converted" }).eq("id", lead.id);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "লিড ক্লায়েন্টে কনভার্ট হয়েছে ✅" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setForm({ name: "", phone: "", email: "", service_type: "General", message: "", status: "new", follow_up_date: "", notes: "", source: "website" });
  };

  const openEdit = (l: any) => {
    setEditId(l.id);
    setForm({
      name: l.name, phone: l.phone || "", email: l.email || "",
      service_type: l.service_type, message: l.message || "",
      status: l.status, follow_up_date: l.follow_up_date || "",
      notes: l.notes || "", source: l.source || "website",
    });
    setOpen(true);
  };

  const filtered = leads.filter((l: any) => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !(l.phone || "").includes(search)) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    return true;
  });

  const todayFollowUps = leads.filter((l: any) => l.follow_up_date === format(new Date(), "yyyy-MM-dd") && l.status !== "converted" && l.status !== "lost");
  const newLeads = leads.filter((l: any) => l.status === "new").length;
  const convertedLeads = leads.filter((l: any) => l.status === "converted").length;

  const sendWhatsApp = (lead: any) => {
    const phone = (lead.phone || "").replace(/[^0-9]/g, "");
    const whatsappNumber = phone.startsWith("0") ? `88${phone}` : phone;
    const msg = `আসসালামু আলাইকুম ${lead.name},\n\nAK IT Solution থেকে যোগাযোগ করছি। আপনার ${lead.service_type} সম্পর্কিত অনুসন্ধানের বিষয়ে জানাতে চাই।\n\nধন্যবাদ`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">লিড ম্যানেজমেন্ট (CRM)</h1>
            <p className="text-sm text-muted-foreground">সম্ভাব্য কাস্টমারদের ট্র্যাক ও ফলোআপ করুন</p>
          </div>
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> নতুন লিড</Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><UserPlus className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">নতুন লিড</p><p className="text-xl font-bold">{newLeads}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><UserCheck className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-xs text-muted-foreground">কনভার্টেড</p><p className="text-xl font-bold">{convertedLeads}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><UserPlus className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">মোট লিড</p><p className="text-xl font-bold">{leads.length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><Calendar className="h-5 w-5 text-yellow-600" /></div>
            <div><p className="text-xs text-muted-foreground">আজকের ফলোআপ</p><p className="text-xl font-bold">{todayFollowUps.length}</p></div>
          </CardContent></Card>
        </div>

        {/* Today's Follow-ups */}
        {todayFollowUps.length > 0 && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-yellow-600" /> আজকের ফলোআপ ({todayFollowUps.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {todayFollowUps.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/50">
                  <div>
                    <p className="text-sm font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.phone} • {l.service_type}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7" onClick={() => sendWhatsApp(l)}><MessageCircle className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => openEdit(l)}><Edit2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="নাম বা ফোন দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s === "all" ? "সব স্ট্যাটাস" : s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>নাম</TableHead>
                  <TableHead>ফোন</TableHead>
                  <TableHead>সার্ভিস</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>ফলোআপ</TableHead>
                  <TableHead>সোর্স</TableHead>
                  <TableHead className="text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো লিড নেই</TableCell></TableRow>
                ) : filtered.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{l.name}</p>
                        {l.email && <p className="text-xs text-muted-foreground">{l.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{l.phone || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{l.service_type}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[l.status] || ""}>{l.status}</Badge></TableCell>
                    <TableCell className="text-xs">{l.follow_up_date ? format(new Date(l.follow_up_date), "dd MMM") : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.source}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {l.phone && <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => sendWhatsApp(l)}><MessageCircle className="h-3.5 w-3.5 text-green-600" /></Button>}
                        {l.status !== "converted" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => convertToClient.mutate(l)} title="ক্লায়েন্টে কনভার্ট">
                            <UserCheck className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(l)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteLead.mutate(l.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "লিড এডিট" : "নতুন লিড যোগ"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveLead.mutate(); }} className="space-y-3">
            <div><Label>নাম *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>ফোন</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>ইমেইল</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>সার্ভিস টাইপ</Label>
                <Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>স্ট্যাটাস</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["new", "contacted", "quoted", "converted", "lost"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>ফলোআপ তারিখ</Label><Input type="date" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} /></div>
            <div><Label>মেসেজ</Label><Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={2} /></div>
            <div><Label>নোট</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>সোর্স</Label>
                <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["website", "whatsapp", "phone", "referral", "facebook", "walk-in", "other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saveLead.isPending}>{saveLead.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteLead.mutate(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        title="স্থায়ীভাবে ডিলিট করুন"
      />
    </>
  );
}
