import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ImagePicker } from "@/components/ImagePicker";
import { GoogleGenerativeAI } from "@google/generative-ai";

const categories = [
  "CCTV",
  "Attendance Device",
  "Networking",
  "IT Support",
  "Installation",
  "Maintenance",
  "Server",
  "Computer",
];

interface ServiceForm {
  name: string;
  description: string;
  category: string;
  price: string;
  status: string;
  image_url: string;
}

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  category: "CCTV",
  price: "0",
  status: "active",
  image_url: "",
};

export default function Services() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // ── Data fetch with retry ──────────────────────────────────────────────────
  const {
    data: services = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    staleTime: 30_000,
  });

  // ── AI description generator ───────────────────────────────────────────────
  const generateDescription = async () => {
    if (!form.name) {
      toast({ title: "Service Name দিন", description: "AI description generate করতে আগে Service এর নাম দিন।", variant: "destructive" });
      return;
    }
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      toast({ title: "API Key নেই", description: ".env ফাইলে VITE_GEMINI_API_KEY যোগ করুন।", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Write a short, professional service description (2-3 sentences, max 100 words) for an IT company in Bangladesh called "AK IT Solution" for the following service:

Service Name: ${form.name}
Category: ${form.category}

The description should be in English, highlight key benefits, and be suitable for a service catalog. Return ONLY the description text, no extra formatting.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      setForm((prev) => ({ ...prev, description: text }));
      toast({ title: "✨ Description তৈরি হয়েছে!" });
    } catch (err: any) {
      toast({ title: "AI Error", description: err.message || "Description generate করতে সমস্যা হয়েছে।", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        price: Number(form.price) || 0,
        status: form.status,
        image_url: form.image_url || null,
      };
      if (editId) {
        const { error } = await supabase.from("services").update(payload).eq("id", editId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["store-services"] });
      toast({ title: editId ? "Service আপডেট হয়েছে ✅" : "নতুন Service যোগ হয়েছে ✅" });
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["store-services"] });
      toast({ title: "Service ডিলিট হয়েছে" });
      setDeleteConfirmId(null);
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openEdit = (service: any) => {
    setEditId(service.id);
    setForm({
      name: service.name ?? "",
      description: service.description ?? "",
      category: service.category ?? "CCTV",
      price: String(service.price ?? 0),
      status: service.status ?? "active",
      image_url: service.image_url ?? "",
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const filtered = services.filter(
    (s: any) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.category?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Services</h1>
            <p className="text-muted-foreground text-sm mt-1">
              আপনার সার্ভিস ক্যাটালগ ম্যানেজ করুন
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Add Service
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Service" : "Add Service"}</DialogTitle>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.name.trim()) {
                    toast({ title: "Service Name দিন", variant: "destructive" });
                    return;
                  }
                  upsertMutation.mutate();
                }}
                className="space-y-4"
              >
                {/* Image */}
                <ImagePicker
                  label="Service Image"
                  value={form.image_url}
                  onChange={(url) => setForm((p) => ({ ...p, image_url: url }))}
                  bucket="service-images"
                  previewAspect="aspect-video"
                />

                {/* Name */}
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="e.g. CCTV Installation"
                  />
                </div>

                {/* Description + AI button */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Description</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-purple-500 hover:text-purple-600"
                      onClick={generateDescription}
                      disabled={aiLoading}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {aiLoading ? "Generating…" : "AI Generate"}
                    </Button>
                  </div>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Service details..."
                    rows={3}
                  />
                </div>

                {/* Category + Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Price (৳)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.price}
                      onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={upsertMutation.isPending}
                >
                  {upsertMutation.isPending
                    ? "Saving…"
                    : editId
                    ? "Update Service"
                    : "Add Service"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {isError ? (
              /* Error state */
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-destructive">
                <AlertCircle className="h-10 w-10" />
                <p className="font-medium text-sm">
                  {(error as Error)?.message || "ডাটা লোড করতে সমস্যা হয়েছে"}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" /> আবার চেষ্টা করুন
                </Button>
              </div>
            ) : isLoading ? (
              /* Loading skeleton */
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading services...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-12 text-muted-foreground"
                      >
                        {search
                          ? `"${search}" এর জন্য কোনো সার্ভিস পাওয়া যায়নি`
                          : "কোনো সার্ভিস নেই। Add Service বাটন দিয়ে নতুন সার্ভিস যোগ করুন।"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          {s.image_url ? (
                            <img
                              src={s.image_url}
                              alt={s.name}
                              className="h-10 w-10 rounded-lg object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">
                              —
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{s.name}</div>
                            {s.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {s.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.category}</Badge>
                        </TableCell>
                        <TableCell>৳{Number(s.price).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={s.status === "active" ? "default" : "secondary"}
                          >
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(s.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteConfirmId}
        onOpenChange={(o) => !o && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
        }}
        title="স্থায়ীভাবে ডিলিট করুন"
        description="এই সার্ভিসটি স্থায়ীভাবে মুছে যাবে এবং স্টোর থেকেও সরিয়ে দেওয়া হবে।"
      />
    </>
  );
}
