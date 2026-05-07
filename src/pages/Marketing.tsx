import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageCircle, Users, Send, Search, Phone, Sparkles, Globe, Target, Settings, FileText, Palette } from "lucide-react";
import { AIContentGenerator } from "@/components/marketing/AIContentGenerator";
import { SEODashboard } from "@/components/marketing/SEODashboard";
import { CampaignManager } from "@/components/marketing/CampaignManager";
import { SocialMediaSettings } from "@/components/marketing/SocialMediaSettings";
import { SavedPosts } from "@/components/marketing/SavedPosts";
import { PostDesigner } from "@/components/marketing/PostDesigner";

const templates = [
  {
    id: "offer",
    title: "🎉 Special Offer",
    message: "আসসালামু আলাইকুম {name}!\n\n🎉 *AK IT Solution* থেকে বিশেষ অফার!\n\n🔥 সকল CCTV ক্যামেরায় ২০% পর্যন্ত ছাড়!\n📦 ফ্রি ইনস্টলেশন\n🛡️ ২ বছরের ওয়ারেন্টি\n\n📞 অর্ডার করতে কল করুন: {phone}\n\n🌐 Visit: akitsolution.store",
  },
  {
    id: "service",
    title: "🔧 Service Reminder",
    message: "আসসালামু আলাইকুম {name}!\n\n🔧 আপনার CCTV/নেটওয়ার্ক সিস্টেমের সার্ভিসিং প্রয়োজন?\n\n✅ ফ্রি চেকআপ\n✅ সাশ্রয়ী মূল্যে মেরামত\n✅ একই দিনে সার্ভিস\n\n📞 যোগাযোগ: {phone}\n\n*AK IT Solution* — আপনার বিশ্বস্ত IT পার্টনার",
  },
  {
    id: "new_product",
    title: "📦 New Product",
    message: "আসসালামু আলাইকুম {name}!\n\n📦 *নতুন প্রোডাক্ট এসেছে!*\n\n🆕 লেটেস্ট CCTV ক্যামেরা, NVR, Router ও আরো অনেক কিছু!\n💰 সেরা দামে!\n🚚 হোম ডেলিভারি\n\n🌐 দেখুন: akitsolution.store\n📞 কল: {phone}",
  },
  {
    id: "custom",
    title: "✏️ Custom Message",
    message: "",
  },
];

export default function Marketing() {
  const [search, setSearch] = useState("");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [customMessage, setCustomMessage] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["marketing-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name, phone, email, company").order("name");
      if (error) throw error;
      return data.filter((c: any) => c.phone);
    },
  });

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings-marketing"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("phone").limit(1).single();
      return data;
    },
  });

  const filteredClients = clients.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map((c: any) => c.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleClient = (id: string) => {
    setSelectedClients(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const sendWhatsAppCampaign = () => {
    if (selectedClients.length === 0) {
      toast.error("Please select at least one client");
      return;
    }
    const companyPhone = companySettings?.phone?.split(",")[0]?.trim() || "01919-060590";
    const messageTemplate = selectedTemplate.id === "custom" ? customMessage : selectedTemplate.message;
    if (!messageTemplate) {
      toast.error("Please write a message");
      return;
    }
    const selectedClientData = clients.filter((c: any) => selectedClients.includes(c.id));
    selectedClientData.forEach((client: any, index: number) => {
      const personalizedMessage = messageTemplate.replace(/{name}/g, client.name).replace(/{phone}/g, companyPhone);
      const phone = client.phone.replace(/[^0-9]/g, "");
      const whatsappNumber = phone.startsWith("0") ? `88${phone}` : phone;
      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(personalizedMessage)}`;
      setTimeout(() => window.open(url, "_blank"), index * 1500);
    });
    toast.success(`${selectedClientData.length} WhatsApp messages initiated`);
  };

  return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Marketing Hub</h1>
          <p className="text-sm text-muted-foreground">AI-powered marketing across all platforms</p>
        </div>

        <Tabs defaultValue="ai-content" className="w-full">
          <TabsList className="grid w-full grid-cols-7 h-9">
            <TabsTrigger value="ai-content" className="text-xs gap-1"><Sparkles className="h-3.5 w-3.5 hidden sm:block" /> AI Content</TabsTrigger>
            <TabsTrigger value="designer" className="text-xs gap-1"><Palette className="h-3.5 w-3.5 hidden sm:block" /> Designer</TabsTrigger>
            <TabsTrigger value="saved" className="text-xs gap-1"><FileText className="h-3.5 w-3.5 hidden sm:block" /> Saved</TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs gap-1"><MessageCircle className="h-3.5 w-3.5 hidden sm:block" /> WhatsApp</TabsTrigger>
            <TabsTrigger value="seo" className="text-xs gap-1"><Globe className="h-3.5 w-3.5 hidden sm:block" /> SEO</TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs gap-1"><Target className="h-3.5 w-3.5 hidden sm:block" /> Campaigns</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-1"><Settings className="h-3.5 w-3.5 hidden sm:block" /> Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="ai-content" className="mt-4">
            <AIContentGenerator />
          </TabsContent>

          <TabsContent value="designer" className="mt-4">
            <PostDesigner />
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            <SavedPosts />
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Message Template</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {templates.map(tmpl => (
                      <button key={tmpl.id} onClick={() => setSelectedTemplate(tmpl)}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${selectedTemplate.id === tmpl.id ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-muted/50"}`}>
                        {tmpl.title}
                      </button>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Message Preview</CardTitle></CardHeader>
                  <CardContent>
                    {selectedTemplate.id === "custom" ? (
                      <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                        placeholder="Write your custom message here... Use {name} for client name and {phone} for company phone"
                        className="w-full min-h-[200px] rounded-md border px-3 py-2 text-xs bg-background" />
                    ) : (
                      <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3 text-xs whitespace-pre-wrap border border-green-200 dark:border-green-800">
                        {selectedTemplate.message.replace(/{name}/g, "Customer Name").replace(/{phone}/g, "01919-060590")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" /> Select Clients
                        <Badge variant="secondary" className="text-[10px]">{selectedClients.length} selected</Badge>
                      </CardTitle>
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={toggleSelectAll}>
                        {selectAll ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className="pl-8" />
                    </div>
                    <div className="max-h-[400px] overflow-y-auto space-y-1">
                      {filteredClients.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">No clients with phone numbers found</p>
                      ) : (
                        filteredClients.map((client: any) => (
                          <label key={client.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${selectedClients.includes(client.id) ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"}`}>
                            <Checkbox checked={selectedClients.includes(client.id)} onCheckedChange={() => toggleClient(client.id)} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs">{client.name}</p>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                                {client.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" /> {client.phone}</span>}
                                {client.company && <span>{client.company}</span>}
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Button onClick={sendWhatsAppCampaign} className="w-full gap-2 h-11" disabled={selectedClients.length === 0}>
                  <Send className="h-4 w-4" /> Send WhatsApp to {selectedClients.length} Client{selectedClients.length !== 1 ? "s" : ""}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">Each client will open in a new WhatsApp tab with personalized message</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="mt-4">
            <SEODashboard />
          </TabsContent>

          <TabsContent value="campaigns" className="mt-4">
            <CampaignManager />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <SocialMediaSettings />
          </TabsContent>
        </Tabs>
      </div>
);
}
