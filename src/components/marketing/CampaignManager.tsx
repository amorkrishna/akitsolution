import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Calendar, Target, TrendingUp, Trash2, Edit, Eye } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  platform: string;
  type: string;
  status: "draft" | "active" | "completed" | "paused";
  startDate: string;
  content: string;
  createdAt: string;
}

export function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem("marketing_campaigns");
    return saved ? JSON.parse(saved) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", platform: "facebook", type: "product_launch", startDate: "", content: "" });

  const saveCampaigns = (updated: Campaign[]) => {
    setCampaigns(updated);
    localStorage.setItem("marketing_campaigns", JSON.stringify(updated));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (editingId) {
      const updated = campaigns.map(c => c.id === editingId ? { ...c, ...form } : c);
      saveCampaigns(updated);
      toast.success("Campaign updated!");
    } else {
      const newCampaign: Campaign = {
        id: Date.now().toString(),
        ...form,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      saveCampaigns([newCampaign, ...campaigns]);
      toast.success("Campaign created!");
    }
    setForm({ name: "", platform: "facebook", type: "product_launch", startDate: "", content: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const toggleStatus = (id: string) => {
    const updated = campaigns.map(c => {
      if (c.id !== id) return c;
      const nextStatus: Record<string, Campaign["status"]> = { draft: "active", active: "paused", paused: "active", completed: "draft" };
      return { ...c, status: nextStatus[c.status] || "draft" };
    });
    saveCampaigns(updated);
  };

  const deleteCampaign = (id: string) => {
    saveCampaigns(campaigns.filter(c => c.id !== id));
    toast.success("Campaign deleted");
  };

  const editCampaign = (c: Campaign) => {
    setForm({ name: c.name, platform: c.platform, type: c.type, startDate: c.startDate, content: c.content });
    setEditingId(c.id);
    setShowForm(true);
  };

  const statusColor = (s: string) => {
    if (s === "active") return "bg-green-500/10 text-green-600 border-green-500/20";
    if (s === "paused") return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    if (s === "completed") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === "active").length,
    draft: campaigns.filter(c => c.status === "draft").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-500">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-muted-foreground">{stats.draft}</p><p className="text-xs text-muted-foreground">Draft</p></CardContent></Card>
      </div>

      {/* Add Campaign */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Campaigns</h3>
        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", platform: "facebook", type: "product_launch", startDate: "", content: "" }); }}>
          <Plus className="h-3.5 w-3.5" /> New Campaign
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Campaign Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Eid Sale 2026" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Platform</Label>
                <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="all">All Platforms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Campaign Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product_launch">Product Launch</SelectItem>
                    <SelectItem value="discount_offer">Discount Offer</SelectItem>
                    <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                    <SelectItem value="service_promo">Service Promo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Content / Notes</Label>
              <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Campaign content or notes..." className="mt-1" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" className="text-xs">{editingId ? "Update" : "Create"} Campaign</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign List */}
      <div className="space-y-2">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No campaigns yet. Create your first campaign!</p>
            </CardContent>
          </Card>
        ) : (
          campaigns.map(c => (
            <Card key={c.id}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <Badge variant="outline" className={`text-[10px] ${statusColor(c.status)}`}>{c.status}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{c.platform}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                    {c.startDate && <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> {c.startDate}</span>}
                    <span>{c.type.replace("_", " ")}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleStatus(c.id)}>
                    <TrendingUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editCampaign(c)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCampaign(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
