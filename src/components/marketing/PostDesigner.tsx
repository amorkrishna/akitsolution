import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Image as ImageIcon, Download, Save, RefreshCw, Upload, Sparkles, Palette, Type, Trash2, Facebook } from "lucide-react";
import html2canvas from "html2canvas";

const templates = [
  { id: "offer", name: "🔥 Special Offer", bg: "from-red-600 to-orange-500", textColor: "text-white" },
  { id: "product", name: "📦 Product Showcase", bg: "from-blue-600 to-indigo-700", textColor: "text-white" },
  { id: "service", name: "🔧 Service Promo", bg: "from-green-600 to-teal-500", textColor: "text-white" },
  { id: "brand", name: "🏢 Brand Awareness", bg: "from-purple-600 to-pink-500", textColor: "text-white" },
  { id: "minimal", name: "✨ Minimal Clean", bg: "from-gray-50 to-white", textColor: "text-gray-900" },
  { id: "dark", name: "🌙 Dark Premium", bg: "from-gray-900 to-black", textColor: "text-white" },
];

const platforms = [
  { id: "facebook", label: "Facebook (1200×630)", w: 1200, h: 630 },
  { id: "instagram", label: "Instagram (1080×1080)", w: 1080, h: 1080 },
  { id: "story", label: "Story (1080×1920)", w: 1080, h: 1920 },
  { id: "twitter", label: "Twitter (1600×900)", w: 1600, h: 900 },
];

export function PostDesigner() {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [template, setTemplate] = useState(templates[0]);
  const [platform, setPlatform] = useState(platforms[0]);
  const [headline, setHeadline] = useState("আজই অর্ডার করুন!");
  const [subtext, setSubtext] = useState("সেরা দামে CCTV ক্যামেরা");
  const [price, setPrice] = useState("৳4,500");
  const [companyName, setCompanyName] = useState("AK IT Solution");
  const [phone, setPhone] = useState("01919-060590");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const generateAIImage = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt for AI image");
      return;
    }
    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("marketing-image", {
        body: {
          prompt: aiPrompt,
          platform: platform.id,
          style: `${template.name} style, marketing post`,
        },
      });
      if (error) throw error;
      if (data.image_url) {
        setAiImage(data.image_url);
        toast.success("AI image generated!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate image");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const backgroundImage = aiImage || uploadedImage;

  const downloadPost = async () => {
    if (!canvasRef.current) return;
    try {
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      const link = document.createElement("a");
      link.download = `marketing-post-${platform.id}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Post downloaded!");
    } catch {
      toast.error("Download failed");
    }
  };

  const saveToDatabase = async () => {
    if (!canvasRef.current) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, allowTaint: true });
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
      );
      const path = `marketing/designed-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from("company-assets").upload(path, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("company-assets").getPublicUrl(path);

      const { error } = await supabase.from("marketing_posts").insert({
        user_id: user.id,
        platform: platform.id,
        campaign_type: "custom_design",
        content: `${headline}\n${subtext}\n${price}\n${companyName}\n${phone}`,
        image_url: publicUrl,
        status: "draft",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["marketing-posts"] });
      toast.success("Post saved to Saved Posts!");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const publishToFacebook = async () => {
    if (!canvasRef.current) return;
    setIsPublishing(true);
    try {
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, allowTaint: true });
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
      );
      const path = `marketing/fb-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from("company-assets").upload(path, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("company-assets").getPublicUrl(path);

      const postMessage = `${headline}\n${subtext}\n${price ? `💰 ${price}` : ""}\n\n${companyName}\n📞 ${phone}`.trim();

      const { data, error } = await supabase.functions.invoke("facebook-post", {
        body: {
          message: postMessage,
          image_url: publicUrl,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success("✅ Facebook Page এ পোস্ট করা হয়েছে!");
    } catch (err: any) {
      toast.error(err.message || "Facebook পোস্ট ব্যর্থ হয়েছে");
    } finally {
      setIsPublishing(false);
    }
  };

  const aspectRatio = platform.w / platform.h;
  const previewWidth = 400;
  const previewHeight = previewWidth / aspectRatio;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Controls */}
      <div className="lg:col-span-2 space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4" /> Design Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Platform Size</Label>
              <Select value={platform.id} onValueChange={id => setPlatform(platforms.find(p => p.id === id)!)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Template</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {templates.map(t => (
                  <button key={t.id} onClick={() => setTemplate(t)}
                    className={`p-2 rounded-md border text-[10px] text-center transition-all ${template.id === t.id ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/50"}`}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1"><Type className="h-3 w-3" /> Headline</Label>
              <Input value={headline} onChange={e => setHeadline(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Subtext</Label>
              <Textarea value={subtext} onChange={e => setSubtext(e.target.value)} rows={2} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Price</Label>
                <Input value={price} onChange={e => setPrice(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Company Name</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Upload Background Image
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed" />
              <p className="text-[10px] text-muted-foreground text-center bg-background relative z-10 px-2 w-fit mx-auto">or generate with AI</p>
            </div>

            <div>
              <Textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                placeholder="Describe image... e.g. CCTV camera promotional banner with tech background" rows={2} className="text-xs" />
              <Button onClick={generateAIImage} disabled={isGeneratingAI} size="sm" className="w-full mt-2 text-xs gap-1">
                {isGeneratingAI ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {isGeneratingAI ? "Generating..." : "Generate AI Image"}
              </Button>
            </div>

            {backgroundImage && (
              <div className="relative">
                <img src={backgroundImage} alt="Background" className="w-full h-24 object-cover rounded border" />
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5"
                  onClick={() => { setUploadedImage(null); setAiImage(null); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview & Actions */}
      <div className="lg:col-span-3 space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Preview</CardTitle>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={downloadPost}>
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={saveToDatabase} disabled={isSaving}>
                  <Save className="h-3.5 w-3.5" /> {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" className="text-xs gap-1 h-7 bg-[#1877F2] hover:bg-[#166FE5]" onClick={publishToFacebook} disabled={isPublishing}>
                  <Facebook className="h-3.5 w-3.5" /> {isPublishing ? "Posting..." : "Post to FB"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center overflow-hidden">
              <div
                ref={canvasRef}
                className={`relative bg-gradient-to-br ${template.bg} overflow-hidden flex flex-col items-center justify-center`}
                style={{
                  width: `${previewWidth}px`,
                  height: `${previewHeight}px`,
                  minHeight: "200px",
                }}
              >
                {/* Background Image */}
                {backgroundImage && (
                  <div className="absolute inset-0">
                    <img src={backgroundImage} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40" />
                  </div>
                )}

                {/* Content Overlay */}
                <div className={`relative z-10 text-center p-6 ${backgroundImage ? "text-white" : template.textColor}`}>
                  {price && (
                    <div className="inline-block bg-yellow-400 text-black font-bold text-lg px-4 py-1 rounded-full mb-3 shadow-lg">
                      {price}
                    </div>
                  )}
                  <h2 className="font-bold text-2xl leading-tight drop-shadow-lg mb-2">
                    {headline}
                  </h2>
                  {subtext && (
                    <p className="text-sm opacity-90 drop-shadow mb-4 max-w-[80%] mx-auto">
                      {subtext}
                    </p>
                  )}
                  <div className="mt-auto pt-3 border-t border-white/20">
                    <p className="font-bold text-sm drop-shadow">{companyName}</p>
                    {phone && <p className="text-xs opacity-80 mt-0.5">📞 {phone}</p>}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center mt-2">
              {platform.label} • Download করে Facebook/Instagram এ পোস্ট করুন
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
