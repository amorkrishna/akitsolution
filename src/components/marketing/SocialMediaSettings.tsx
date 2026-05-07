import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Facebook, Instagram, Twitter, MessageCircle, Globe, MapPin } from "lucide-react";

export function SocialMediaSettings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    facebook_page_url: "",
    instagram_handle: "",
    twitter_handle: "",
    whatsapp_number: "",
    website_url: "",
    google_business_url: "",
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["marketing-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("marketing_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setForm({
        facebook_page_url: settings.facebook_page_url || "",
        instagram_handle: settings.instagram_handle || "",
        twitter_handle: settings.twitter_handle || "",
        whatsapp_number: settings.whatsapp_number || "",
        website_url: settings.website_url || "",
        google_business_url: settings.google_business_url || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (settings) {
        const { error } = await supabase
          .from("marketing_settings")
          .update(form)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("marketing_settings")
          .insert({ ...form, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-settings"] });
      toast.success("Social media settings saved!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const socialFields = [
    { key: "facebook_page_url", label: "Facebook Page URL", icon: Facebook, placeholder: "https://facebook.com/yourpage", color: "text-[#1877F2]" },
    { key: "instagram_handle", label: "Instagram Handle", icon: Instagram, placeholder: "@yourhandle", color: "text-[#E4405F]" },
    { key: "twitter_handle", label: "Twitter/X Handle", icon: Twitter, placeholder: "@yourhandle", color: "text-foreground" },
    { key: "whatsapp_number", label: "WhatsApp Business Number", icon: MessageCircle, placeholder: "+8801919060590", color: "text-[#25D366]" },
    { key: "website_url", label: "Website URL", icon: Globe, placeholder: "https://yourwebsite.com", color: "text-primary" },
    { key: "google_business_url", label: "Google My Business URL", icon: MapPin, placeholder: "https://g.page/yourbusiness", color: "text-[#4285F4]" },
  ];

  if (isLoading) return <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Social Media Links
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            আপনার সোশ্যাল মিডিয়া লিংক সেভ করুন — AI কন্টেন্ট জেনারেটরে অটো যোগ হবে
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {socialFields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <field.icon className={`h-3.5 w-3.5 ${field.color}`} />
                  {field.label}
                </Label>
                <Input
                  value={(form as any)[field.key]}
                  onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="text-sm"
                />
              </div>
            ))}
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      {(form.facebook_page_url || form.instagram_handle || form.twitter_handle || form.whatsapp_number) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Preview — Your Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {form.facebook_page_url && (
                <a href={form.facebook_page_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-[#1877F2] text-white px-3 py-1.5 rounded-full text-xs hover:opacity-90 transition">
                  <Facebook className="h-3.5 w-3.5" /> Facebook
                </a>
              )}
              {form.instagram_handle && (
                <a href={`https://instagram.com/${form.instagram_handle.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white px-3 py-1.5 rounded-full text-xs hover:opacity-90 transition">
                  <Instagram className="h-3.5 w-3.5" /> {form.instagram_handle}
                </a>
              )}
              {form.twitter_handle && (
                <a href={`https://x.com/${form.twitter_handle.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-black text-white px-3 py-1.5 rounded-full text-xs hover:opacity-90 transition">
                  <Twitter className="h-3.5 w-3.5" /> {form.twitter_handle}
                </a>
              )}
              {form.whatsapp_number && (
                <a href={`https://wa.me/${form.whatsapp_number.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-[#25D366] text-white px-3 py-1.5 rounded-full text-xs hover:opacity-90 transition">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
