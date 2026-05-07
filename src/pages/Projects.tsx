import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, CalendarIcon, Upload, ImageIcon, X, ListPlus, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

export default function Projects() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", client_id: "", status: "pending", priority: "medium", budget: "", show_in_store: false });
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [includedItems, setIncludedItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: async () => (await supabase.from("projects").select("*, clients(name)").order("created_at", { ascending: false })).data || [] });
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: async () => (await supabase.from("clients").select("id, name")).data || [] });

  const uploadImage = async (projectId: string): Promise<string | null> => {
    if (!imageFile) return null;
    const ext = imageFile.name.split('.').pop();
    const filePath = `${projectId}.${ext}`;
    const { error } = await supabase.storage.from("package-images").upload(filePath, imageFile, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("package-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      const payload: any = {
        title: form.title, description: form.description,
        client_id: form.client_id || null,
        budget: form.budget ? Number(form.budget) : null,
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
        status: form.status, priority: form.priority,
        included_items: includedItems,
        show_in_store: form.show_in_store,
      };
      let projectId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from("projects").insert(payload).select().single();
        if (error) throw error;
        projectId = inserted.id;
      }
      if (imageFile && projectId) {
        const imageUrl = await uploadImage(projectId);
        if (imageUrl) {
          await supabase.from("projects").update({ image_url: imageUrl } as any).eq("id", projectId);
        }
      }
    },
    onSuccess: () => { setUploading(false); queryClient.invalidateQueries({ queryKey: ["projects"] }); setOpen(false); setEditing(null); resetForm(); toast({ title: editing ? "Package updated" : "Package created" }); },
    onError: (err: any) => { setUploading(false); toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("projects").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); toast({ title: "Package deleted" }); },
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, show }: { id: string; show: boolean }) => {
      const { error } = await supabase.from("projects").update({ show_in_store: show } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const resetForm = () => {
    setForm({ title: "", description: "", client_id: "", status: "pending", priority: "medium", budget: "", show_in_store: false });
    setStartDate(new Date()); setEndDate(undefined);
    setImageFile(null); setImagePreview(null);
    setIncludedItems([]); setNewItem("");
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ title: p.title, description: p.description || "", client_id: p.client_id || "", status: p.status, priority: p.priority, budget: p.budget?.toString() || "", show_in_store: (p as any).show_in_store === true });
    setStartDate(p.start_date ? new Date(p.start_date) : new Date());
    setEndDate(p.end_date ? new Date(p.end_date) : undefined);
    setImagePreview((p as any).image_url || null);
    setImageFile(null);
    setIncludedItems(Array.isArray((p as any).included_items) ? (p as any).included_items : []);
    setNewItem("");
    setOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const addItem = () => {
    if (newItem.trim()) {
      setIncludedItems([...includedItems, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeItem = (index: number) => {
    setIncludedItems(includedItems.filter((_, i) => i !== index));
  };

  const statusColor: Record<string, string> = { pending: "bg-warning/10 text-warning", in_progress: "bg-info/10 text-info", completed: "bg-success/10 text-success", cancelled: "bg-destructive/10 text-destructive" };
  const priorityColor: Record<string, string> = { low: "bg-muted text-muted-foreground", medium: "bg-warning/10 text-warning", high: "bg-destructive/10 text-destructive" };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold tracking-tight">Packages</h1><p className="text-muted-foreground text-sm">Manage camera & IT solution packages for the online store</p></div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); resetForm(); } }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Package</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit Package" : "New Package"}</DialogTitle></DialogHeader>

              {/* Package Image */}
              <div className="space-y-2 border-b border-border pb-4">
                <Label>Package Image</Label>
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package-image" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Upload className="h-4 w-4" />
                        {imagePreview ? "Change image" : "Upload image"}
                      </div>
                    </Label>
                    <input id="package-image" type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    <p className="text-[10px] text-muted-foreground">JPG, PNG up to 5MB</p>
                  </div>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

                {/* Included Items */}
                <div className="space-y-3 border border-border rounded-lg p-4">
                  <Label className="flex items-center gap-2"><ListPlus className="h-4 w-4 text-primary" /> Package Includes</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      placeholder="e.g. 4x CCTV Camera, 1x DVR 8CH..."
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>Add</Button>
                  </div>
                  {includedItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {includedItems.map((item, i) => (
                        <Badge key={i} variant="secondary" className="gap-1 pr-1">
                          {item}
                          <button type="button" onClick={() => removeItem(i)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Client</Label>
                    <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Budget (৳)</Label>
                    <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                  </div>
                  <div className="space-y-2"><Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {/* Show in Store Toggle */}
                <div className="flex items-center justify-between border border-border rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    {form.show_in_store ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <Label className="text-sm font-medium">Show in Online Store</Label>
                      <p className="text-[10px] text-muted-foreground">Make this package visible to customers</p>
                    </div>
                  </div>
                  <Switch checked={form.show_in_store} onCheckedChange={(v) => setForm({ ...form, show_in_store: v })} />
                </div>

                <Button type="submit" className="w-full" disabled={saveMutation.isPending || uploading}>
                  {uploading ? "Uploading..." : editing ? "Update" : "Create"} Package
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Includes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects?.map((p) => (
                  <TableRow key={p.id} className={!(p as any).show_in_store ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="h-10 w-10 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                        {(p as any).image_url ? (
                          <img src={(p as any).image_url} alt={p.title} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {Array.isArray((p as any).included_items) && (p as any).included_items.length > 0
                          ? (p as any).included_items.slice(0, 3).map((item: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">{item}</Badge>
                            ))
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                        {Array.isArray((p as any).included_items) && (p as any).included_items.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">+{(p as any).included_items.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={statusColor[p.status] || ""}>{(p.status || "pending").replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      <Switch
                        checked={(p as any).show_in_store === true}
                        onCheckedChange={(v) => toggleVisibility.mutate({ id: p.id, show: v })}
                        className="scale-75"
                      />
                    </TableCell>
                    <TableCell>{p.budget ? `৳${Number(p.budget).toLocaleString()}` : "—"}</TableCell>
                    <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                  </TableRow>
                ))}
                {(!projects || projects.length === 0) && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No packages yet</TableCell></TableRow>}
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
