import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save, LayoutGrid, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/ImagePicker";

interface CategoryTile {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string;
  sort_order: number;
  is_active: boolean;
}

export function CategoryTilesManager() {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, CategoryTile>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: tiles, isLoading } = useQuery({
    queryKey: ["category_tiles_admin"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("category_tiles" as any) as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as CategoryTile[];
    },
  });

  useEffect(() => {
    if (tiles) {
      const map: Record<string, CategoryTile> = {};
      tiles.forEach((t) => (map[t.id] = { ...t }));
      setDrafts(map);
    }
  }, [tiles]);

  const saveMutation = useMutation({
    mutationFn: async (tile: CategoryTile) => {
      const { error } = await (supabase.from("category_tiles" as any) as any)
        .update({
          title: tile.title,
          subtitle: tile.subtitle,
          image_url: tile.image_url,
          link_url: tile.link_url,
          is_active: tile.is_active,
        })
        .eq("id", tile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["category_tiles_admin"] });
      qc.invalidateQueries({ queryKey: ["category_tiles_public"] });
      toast.success("Tile saved");
    },
    onError: (err: any) => toast.error(err?.message || "Save failed"),
    onSettled: () => setSavingId(null),
  });

  const update = (id: string, patch: Partial<CategoryTile>) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" />
          Storefront Category Tiles
        </CardTitle>
        <CardDescription>
          Customize the 3 category cards (CCTV, Attendance, Servicing) shown on your home page. Upload an image
          or paste a public image URL — it overlays the gradient.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.values(drafts)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((tile) => (
            <div key={tile.id} className="rounded-xl border p-4 sm:p-5 bg-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-base">{tile.title || tile.slug}</h4>
                  <p className="text-xs text-muted-foreground">slug: {tile.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`active-${tile.id}`} className="text-xs">Active</Label>
                  <Switch
                    id={`active-${tile.id}`}
                    checked={tile.is_active}
                    onCheckedChange={(v) => update(tile.id, { is_active: v })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={tile.title}
                      onChange={(e) => update(tile.id, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Subtitle</Label>
                    <Input
                      value={tile.subtitle || ""}
                      onChange={(e) => update(tile.id, { subtitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Link URL</Label>
                    <Input
                      value={tile.link_url}
                      onChange={(e) => update(tile.id, { link_url: e.target.value })}
                      placeholder="/?cat=CCTV"
                    />
                  </div>
                </div>
                <ImagePicker
                  value={tile.image_url || ""}
                  onChange={(url) => update(tile.id, { image_url: url || null })}
                  bucket="storefront-images"
                  label="Tile image"
                  previewAspect="aspect-video"
                />
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  size="sm"
                  onClick={() => {
                    setSavingId(tile.id);
                    saveMutation.mutate(tile);
                  }}
                  disabled={savingId === tile.id}
                >
                  {savingId === tile.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

export default CategoryTilesManager;