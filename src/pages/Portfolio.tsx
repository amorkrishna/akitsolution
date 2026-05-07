import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Image, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

type PortfolioProject = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string | null;
  client_name: string | null;
  location: string | null;
  completed_date: string | null;
  is_featured: boolean;
  created_at: string;
};

const categories = ["CCTV", "Networking", "IT Support", "Computer", "Server", "Access Control", "Other"];

export default function Portfolio() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioProject | null>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "CCTV", client_name: "", location: "", completed_date: "", is_featured: false });
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["portfolio_projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("portfolio_projects").select("*").order("completed_date", { ascending: false });
      if (error) throw error;
      return data as PortfolioProject[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editing) {
        const { error } = await supabase.from("portfolio_projects").update(values).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("portfolio_projects").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio_projects"] });
      toast.success(editing ? "Project updated" : "Project added");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolio_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio_projects"] });
      toast.success("Project deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", category: "CCTV", client_name: "", location: "", completed_date: "", is_featured: false });
    setImageUrl(null);
    setDialogOpen(true);
  };

  const openEdit = (p: PortfolioProject) => {
    setEditing(p);
    setForm({ title: p.title, description: p.description || "", category: p.category, client_name: p.client_name || "", location: p.location || "", completed_date: p.completed_date || "", is_featured: p.is_featured });
    setImageUrl(p.image_url);
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("portfolio-images").upload(path, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("portfolio-images").getPublicUrl(path);
    setImageUrl(urlData.publicUrl);
    setUploading(false);
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    saveMutation.mutate({
      title: form.title, description: form.description || null, category: form.category,
      image_url: imageUrl, client_name: form.client_name || null, location: form.location || null,
      completed_date: form.completed_date || null, is_featured: form.is_featured,
    });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FolderKanban className="h-6 w-6 text-primary" /> Portfolio</h1>
            <p className="text-muted-foreground text-sm">Manage your completed project showcase</p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Project</Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">All Projects ({projects.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>
            ) : projects.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No portfolio projects yet. Add your first completed project!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.image_url ? <img src={p.image_url} alt={p.title} className="h-10 w-14 rounded object-cover" /> : <div className="h-10 w-14 rounded bg-muted flex items-center justify-center"><Image className="h-4 w-4 text-muted-foreground" /></div>}
                      </TableCell>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.location || "—"}</TableCell>
                      <TableCell>{p.is_featured ? <Badge className="bg-primary/10 text-primary">Featured</Badge> : "—"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteConfirmId(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Project" : "Add Project"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. 32-Camera CCTV Installation" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the project" rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Completed Date</Label><Input type="date" value={form.completed_date} onChange={e => setForm({ ...form, completed_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Client Name</Label><Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Optional" /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Dhaka" /></div>
            </div>
            <div>
              <Label>Project Image</Label>
              <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
              {imageUrl && <img src={imageUrl} alt="Preview" className="mt-2 h-24 rounded-lg object-cover" />}
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_featured} onCheckedChange={v => setForm({ ...form, is_featured: v })} />
              <Label>Featured Project</Label>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editing ? "Update Project" : "Add Project"}</Button>
          </div>
        </DialogContent>
      </Dialog>

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
