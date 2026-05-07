import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, MessageSquareQuote } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_role: string | null;
  rating: number;
  review_text: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
}

export default function Reviews() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [form, setForm] = useState({ reviewer_name: "", reviewer_role: "", rating: 5, review_text: "", is_published: true, sort_order: 0 });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_reviews").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Review[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("customer_reviews").update({
          reviewer_name: form.reviewer_name,
          reviewer_role: form.reviewer_role || null,
          rating: form.rating,
          review_text: form.review_text,
          is_published: form.is_published,
          sort_order: form.sort_order,
          updated_at: new Date().toISOString(),
        }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customer_reviews").insert({
          reviewer_name: form.reviewer_name,
          reviewer_role: form.reviewer_role || null,
          rating: form.rating,
          review_text: form.review_text,
          is_published: form.is_published,
          sort_order: form.sort_order,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success(editing ? "Review updated" : "Review added");
      setDialogOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save review"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review deleted");
    },
    onError: () => toast.error("Failed to delete review"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ reviewer_name: "", reviewer_role: "", rating: 5, review_text: "", is_published: true, sort_order: (reviews?.length || 0) + 1 });
    setDialogOpen(true);
  };

  const openEdit = (r: Review) => {
    setEditing(r);
    setForm({ reviewer_name: r.reviewer_name, reviewer_role: r.reviewer_role || "", rating: r.rating, review_text: r.review_text, is_published: r.is_published, sort_order: r.sort_order });
    setDialogOpen(true);
  };

  const togglePublish = async (r: Review) => {
    await supabase.from("customer_reviews").update({ is_published: !r.is_published, updated_at: new Date().toISOString() }).eq("id", r.id);
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    toast.success(r.is_published ? "Review hidden" : "Review published");
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquareQuote className="h-6 w-6 text-amber-500" /> Customer Reviews
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Manage reviews shown on the online store</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add Review
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map((r) => (
              <div key={r.id} className={`rounded-xl border bg-card p-4 flex flex-col gap-3 ${!r.is_published ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                    ))}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.is_published ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    {r.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">"{r.review_text}"</p>
                <div className="mt-auto pt-2 border-t">
                  <p className="text-sm font-semibold">{r.reviewer_name}</p>
                  {r.reviewer_role && <p className="text-xs text-muted-foreground">{r.reviewer_role}</p>}
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <Button variant="outline" size="sm" className="gap-1 text-xs flex-1" onClick={() => openEdit(r)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => togglePublish(r)}>
                    {r.is_published ? "Hide" : "Show"}
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={() => setDeleteConfirmId(r.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <MessageSquareQuote className="h-12 w-12 mx-auto text-muted mb-3" />
            <p className="text-muted-foreground">No reviews yet</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" /> Add First Review</Button>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Review" : "Add Review"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Reviewer Name *</Label>
              <Input value={form.reviewer_name} onChange={e => setForm({ ...form, reviewer_name: e.target.value })} required placeholder="Customer name" />
            </div>
            <div className="space-y-1.5">
              <Label>Role / Location</Label>
              <Input value={form.reviewer_role} onChange={e => setForm({ ...form, reviewer_role: e.target.value })} placeholder="e.g. Shop Owner, Mirpur" />
            </div>
            <div className="space-y-1.5">
              <Label>Rating (1-5)</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })}>
                    <Star className={`h-6 w-6 cursor-pointer transition-colors ${n <= form.rating ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Review Text *</Label>
              <textarea
                value={form.review_text}
                onChange={e => setForm({ ...form, review_text: e.target.value })}
                required
                placeholder="Customer's review..."
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="space-y-1.5 flex-1">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} />
                <Label className="text-sm">Published</Label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={upsert.isPending}>
              {upsert.isPending ? "Saving..." : editing ? "Update Review" : "Add Review"}
            </Button>
          </form>
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
