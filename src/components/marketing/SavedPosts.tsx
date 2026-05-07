import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Trash2, Edit, Save, X, Facebook, Instagram, Twitter, MessageCircle, Globe, Image as ImageIcon, Upload, Eye, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

const platformIcons: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  whatsapp: MessageCircle,
  google_seo: Globe,
};

const platformColors: Record<string, string> = {
  facebook: "bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20",
  instagram: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  twitter: "bg-gray-900/10 text-gray-900 dark:text-gray-100 border-gray-500/20",
  whatsapp: "bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20",
  google_seo: "bg-[#4285F4]/10 text-[#4285F4] border-[#4285F4]/20",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  published: "bg-green-500/10 text-green-600 border-green-500/20",
  archived: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

export function SavedPosts() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["marketing-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-posts"] });
      toast.success("Post deleted!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, content, status }: { id: string; content?: string; status?: string }) => {
      const updates: any = {};
      if (content !== undefined) updates.content = content;
      if (status !== undefined) updates.status = status;
      const { error } = await supabase.from("marketing_posts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-posts"] });
      setEditingId(null);
      toast.success("Post updated!");
    },
  });

  const handleImageUpload = async (postId: string, file: File) => {
    setUploadingId(postId);
    try {
      const ext = file.name.split(".").pop();
      const path = `marketing/${postId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("company-assets").getPublicUrl(path);
      const { error } = await supabase.from("marketing_posts").update({ image_url: publicUrl }).eq("id", postId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["marketing-posts"] });
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  const removeImage = async (postId: string) => {
    const { error } = await supabase.from("marketing_posts").update({ image_url: null }).eq("id", postId);
    if (error) {
      toast.error("Failed to remove image");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["marketing-posts"] });
    toast.success("Image removed!");
  };

  const publishToFacebook = async (post: any) => {
    setPublishingId(post.id);
    try {
      const { data, error } = await supabase.functions.invoke("facebook-post", {
        body: {
          message: post.content,
          image_url: post.image_url || undefined,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      // Update status to published
      await supabase.from("marketing_posts").update({ status: "published" }).eq("id", post.id);
      queryClient.invalidateQueries({ queryKey: ["marketing-posts"] });
      toast.success("✅ Facebook এ পোস্ট করা হয়েছে!");
    } catch (err: any) {
      toast.error(err.message || "Facebook পোস্ট ব্যর্থ হয়েছে");
    } finally {
      setPublishingId(null);
    }
  };

  if (isLoading) return <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>;

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No saved posts yet</p>
          <p className="text-xs mt-1">Generate content from AI Content tab and save it here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Saved Posts ({posts.length})</h3>
      </div>

      {posts.map(post => {
        const PlatformIcon = platformIcons[post.platform] || Globe;
        const isEditing = editingId === post.id;
        const isPreviewing = previewId === post.id;

        return (
          <Card key={post.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                  <PlatformIcon className="h-4 w-4" />
                  <Badge variant="outline" className={`text-[10px] ${platformColors[post.platform] || ""}`}>
                    {post.platform}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${statusColors[post.status] || ""}`}>
                    {post.status}
                  </Badge>
                  {post.product_name && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{post.product_name}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => { navigator.clipboard.writeText(post.content); toast.success("Copied!"); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => setPreviewId(isPreviewing ? null : post.id)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => { setEditingId(isEditing ? null : post.id); setEditContent(post.content); }}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-[#1877F2]"
                    title="Publish to Facebook"
                    disabled={publishingId === post.id}
                    onClick={() => publishToFacebook(post)}>
                    {publishingId === post.id ? (
                      <Send className="h-3.5 w-3.5 animate-pulse" />
                    ) : (
                      <Facebook className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => deleteMutation.mutate(post.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={6} className="text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" className="text-xs gap-1" onClick={() => updateMutation.mutate({ id: post.id, content: editContent })}>
                        <Save className="h-3 w-3" /> Save
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : isPreviewing ? (
                  <div className="space-y-3">
                    {/* Social Media Post Preview */}
                    <div className="border rounded-lg overflow-hidden max-w-md mx-auto">
                      {post.image_url && (
                        <img src={post.image_url} alt="Post" className="w-full h-48 object-cover" />
                      )}
                      <div className="p-3 text-sm whitespace-pre-wrap">{post.content}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{post.content}</p>
                )}
              </div>

              {/* Image & Status Actions */}
              <div className="flex items-center justify-between p-3 pt-0 gap-2">
                <div className="flex items-center gap-2">
                  {post.image_url ? (
                    <div className="flex items-center gap-1.5">
                      <img src={post.image_url} alt="" className="h-8 w-8 rounded object-cover border" />
                      <Button size="sm" variant="ghost" className="text-[10px] h-6 text-destructive" onClick={() => removeImage(post.id)}>Remove</Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleImageUpload(post.id, e.target.files[0]); }} />
                      <span className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                        <Upload className="h-3 w-3" /> {uploadingId === post.id ? "Uploading..." : "Add Image"}
                      </span>
                    </label>
                  )}
                </div>
                <div className="flex gap-1">
                  {["draft", "published", "archived"].map(s => (
                    <Button key={s} size="sm" variant={post.status === s ? "default" : "outline"}
                      className="text-[10px] h-6 px-2 capitalize"
                      onClick={() => updateMutation.mutate({ id: post.id, status: s })}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="px-3 pb-2 text-[10px] text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString("bn-BD", { year: "numeric", month: "short", day: "numeric" })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
