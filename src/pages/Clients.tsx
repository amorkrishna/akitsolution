import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, MessageSquare, Download } from "lucide-react";
import { openWhatsApp, clientGreetingMessage } from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useTranslation } from "@/contexts/LanguageContext";
import { exportToCSV } from "@/lib/exportUtils";
import type { TablesInsert } from "@/integrations/supabase/types";

export default function Clients() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<TablesInsert<"clients">>({ name: "", email: "", phone: "", address: "", company: "", notes: "" });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await supabase.from("clients").select("*").order("created_at", { ascending: false })).data || [],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: TablesInsert<"clients">) => {
      if (editing) {
        const { error } = await supabase.from("clients").update(data).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setEditing(null);
      setForm({ name: "", email: "", phone: "", address: "", company: "", notes: "" });
      toast({ title: editing ? "Client updated" : "Client added" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client deleted" });
    },
  });

  const openEdit = (client: any) => {
    setEditing(client);
    setForm({ name: client.name, email: client.email, phone: client.phone, address: client.address, company: client.company, notes: client.notes });
    setOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("page.clients.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("page.clients.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => clients?.length && exportToCSV(clients.map(c => ({ Name: c.name, Company: c.company || "", Email: c.email || "", Phone: c.phone || "", Address: c.address || "" })), "clients")}>
              <Download className="h-4 w-4 mr-1" />{t("common.export_csv")}
            </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: "", email: "", phone: "", address: "", company: "", notes: "" }); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />{t("page.clients.add")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? t("page.clients.edit") : t("page.clients.add")}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>{t("common.name")} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>{t("common.company")}</Label><Input value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{t("common.email")}</Label><Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>{t("common.phone")}</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>{t("common.address")}</Label><Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t("common.notes")}</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{editing ? t("common.edit") : t("common.add")} {t("page.clients.title")}</Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead><TableHead>{t("common.company")}</TableHead><TableHead>{t("common.email")}</TableHead><TableHead>{t("common.phone")}</TableHead><TableHead>{t("common.address")}</TableHead><TableHead className="w-24">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.company || "—"}</TableCell>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell>{c.address || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.phone && (
                          <Button variant="ghost" size="icon" onClick={() => openWhatsApp(c.phone!, clientGreetingMessage(c.name))} title="WhatsApp">
                            <MessageSquare className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!clients || clients.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("page.clients.no_clients")}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
