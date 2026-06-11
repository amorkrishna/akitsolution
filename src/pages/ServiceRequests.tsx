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
import { Search, Trash2, Edit2, CheckCircle, Wrench, Clock, AlertTriangle, MessageSquare } from "lucide-react";
import { openWhatsApp, serviceRequestMessage } from "@/lib/whatsapp";
import { sendSMS } from "@/lib/sms";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const CATEGORIES = ["CCTV", "Networking", "Attendance Device", "Computer", "Printer", "Server", "Software", "Smart Home", "Other"];
const STATUSES = ["all", "pending", "accepted", "in_progress", "completed", "cancelled"];
const URGENCIES = ["normal", "urgent", "emergency"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  accepted: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  in_progress: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  completed: "bg-green-500/15 text-green-600 border-green-500/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const urgencyColors: Record<string, string> = {
  normal: "bg-muted text-muted-foreground",
  urgent: "bg-orange-500/15 text-orange-600",
  emergency: "bg-red-500/15 text-red-600",
};

export default function ServiceRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", phone: "", email: "", category: "Other",
    description: "", preferred_date: "", urgency: "normal", status: "pending", notes: "",
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["service-requests"],
    queryFn: async () => {
      const { data } = await supabase.from("service_requests").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveRequest = useMutation({
    mutationFn: async () => {
      const payload = {
        customer_name: form.customer_name,
        phone: form.phone || null,
        email: form.email || null,
        category: form.category,
        description: form.description,
        preferred_date: form.preferred_date || null,
        urgency: form.urgency,
        status: form.status,
        notes: form.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from("service_requests").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_requests").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      toast({ title: editId ? "রিকোয়েস্ট আপডেট হয়েছে" : "রিকোয়েস্ট যোগ হয়েছে" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      toast({ title: "রিকোয়েস্ট ডিলিট হয়েছে" });
    },
  });

  const acceptToServicing = useMutation({
    mutationFn: async (req: any) => {
      const { error: sErr } = await supabase.from("servicing").insert({
        client_name: req.customer_name,
        description: req.description,
        category: req.category,
        service_date: req.preferred_date || new Date().toISOString().split("T")[0],
        status: "pending",
        notes: `From service request. Phone: ${req.phone || "N/A"}`,
      });
      if (sErr) throw sErr;
      const { error: uErr } = await supabase.from("service_requests").update({ status: "accepted" }).eq("id", req.id);
      if (uErr) throw uErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      toast({ title: "রিকোয়েস্ট গ্রহণ করা হয়েছে এবং সার্ভিসিং-এ যোগ হয়েছে ✅" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSendSMS = async (r: any) => {
    if (!r.phone) {
      toast({ title: "No phone number", description: "This customer does not have a phone number.", variant: "destructive" });
      return;
    }
    const message = `Hello ${r.customer_name}, your service request for ${r.category} is currently marked as ${r.status}. Thank you!`;
    try {
      await sendSMS(r.phone, message);
      toast({ title: "SMS Sent", description: "Message delivered successfully." });
    } catch (e: any) {
      toast({ title: "SMS Failed", description: e.message, variant: "destructive" });
    }
  };

  const closeDialog = () => {
    setOpen(false); setEditId(null);
    setForm({ customer_name: "", phone: "", email: "", category: "Other", description: "", preferred_date: "", urgency: "normal", status: "pending", notes: "" });
  };

  const openEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      customer_name: r.customer_name, phone: r.phone || "", email: r.email || "",
      category: r.category, description: r.description, preferred_date: r.preferred_date || "",
      urgency: r.urgency, status: r.status, notes: r.notes || "",
    });
    setOpen(true);
  };

  const filtered = requests.filter((r: any) => {
    if (search && !r.customer_name.toLowerCase().includes(search.toLowerCase()) && !(r.phone || "").includes(search)) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  const pending = requests.filter((r: any) => r.status === "pending").length;
  const urgent = requests.filter((r: any) => r.urgency !== "normal" && r.status === "pending").length;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">সার্ভিস রিকোয়েস্ট</h1>
            <p className="text-sm text-muted-foreground">কাস্টমারদের সার্ভিসিং রিকোয়েস্ট ম্যানেজ করুন</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600" /></div>
            <div><p className="text-xs text-muted-foreground">পেন্ডিং</p><p className="text-xl font-bold">{pending}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
            <div><p className="text-xs text-muted-foreground">আর্জেন্ট</p><p className="text-xl font-bold">{urgent}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Wrench className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">মোট রিকোয়েস্ট</p><p className="text-xl font-bold">{requests.length}</p></div>
          </CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="নাম বা ফোন দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s === "all" ? "সব" : s}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>কাস্টমার</TableHead>
                  <TableHead>ক্যাটাগরি</TableHead>
                  <TableHead>বিবরণ</TableHead>
                  <TableHead>জরুরিতা</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>তারিখ</TableHead>
                  <TableHead className="text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো রিকোয়েস্ট নেই</TableCell></TableRow>
                ) : filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{r.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{r.phone || "—"}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.category}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{r.description}</TableCell>
                    <TableCell><Badge className={`text-xs ${urgencyColors[r.urgency]}`}>{r.urgency}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[r.status] || ""}>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs">{format(new Date(r.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {r.phone && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openWhatsApp(r.phone, serviceRequestMessage(r))} title="WhatsApp">
                              <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSendSMS(r)} title="Send SMS">
                              <svg className="h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            </Button>
                          </>
                        )}
                        {r.status === "pending" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => acceptToServicing.mutate(r)} title="Accept & Servicing-এ যোগ">
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(r)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteRequest.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "রিকোয়েস্ট এডিট" : "নতুন রিকোয়েস্ট"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveRequest.mutate(); }} className="space-y-3">
            <div><Label>কাস্টমার নাম *</Label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>ফোন</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>ইমেইল</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>ক্যাটাগরি</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>জরুরিতা</Label>
                <Select value={form.urgency} onValueChange={v => setForm({ ...form, urgency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{URGENCIES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>বিবরণ *</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>পছন্দের তারিখ</Label><Input type="date" value={form.preferred_date} onChange={e => setForm({ ...form, preferred_date: e.target.value })} /></div>
              <div><Label>স্ট্যাটাস</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["pending", "accepted", "in_progress", "completed", "cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>নোট</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button type="submit" className="w-full" disabled={saveRequest.isPending}>{saveRequest.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
