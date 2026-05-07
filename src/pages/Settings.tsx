import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Building2, CreditCard, FileText, Upload, Image, MessageSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettings, CompanySettings } from "@/hooks/useCompanySettings";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";
import { supabase } from "@/integrations/supabase/client";
import akLogoDefault from "@/assets/ak-logo.png";

export default function Settings() {
  const { settings, isLoading, save } = useCompanySettings();
  const { toast } = useToast();
  const [form, setForm] = useState<CompanySettings>(settings);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!isLoading) setForm(settings); }, [settings, isLoading]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);
      update("logo_url", publicUrl);
      toast({ title: "Logo uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    save.mutate(form, {
      onSuccess: () => toast({ title: "Settings saved successfully" }),
      onError: (err: any) => toast({ title: "Error saving", description: err.message, variant: "destructive" }),
    });
  };

  const update = (field: keyof CompanySettings, value: any) => setForm({ ...form, [field]: value });

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>
;

  return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-sm">Configure your company & invoice defaults</p>
          </div>
          <Button onClick={handleSave} disabled={save.isPending}>
            <Save className="h-4 w-4 mr-2" />{save.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {/* Company Logo */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Image className="h-5 w-5 text-primary" />Company Logo</CardTitle>
            <CardDescription>Upload your company logo — appears on invoices, sidebar & auth page</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  src={form.logo_url || akLogoDefault}
                  alt="Company Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Logo"}
                </Button>
                <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Recommended 200×200px.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Company Information</CardTitle>
            <CardDescription>This info appears on your invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input value={form.company_name} onChange={e => update("company_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input value={form.company_tagline} onChange={e => update("company_tagline", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={e => update("address", e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => update("phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={e => update("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5 text-green-600" />WhatsApp নম্বর</Label>
                <Input value={form.whatsapp_number} onChange={e => update("whatsapp_number", e.target.value)} placeholder="e.g. 01919060590" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Defaults */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Invoice Defaults</CardTitle>
            <CardDescription>Default values for new invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Tax Rate (%)</Label>
                <Input type="number" value={form.default_tax_rate} onChange={e => update("default_tax_rate", Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Invoice Footer Text</Label>
              <Input value={form.footer_text} onChange={e => update("footer_text", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Payment / Bank Details */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Payment Information</CardTitle>
                <CardDescription>Bank details shown on invoices for payment</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="show-payment" className="text-sm text-muted-foreground">Show on Invoice</Label>
                <Switch id="show-payment" checked={form.show_payment_info} onCheckedChange={v => update("show_payment_info", v)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={form.bank_name} onChange={e => update("bank_name", e.target.value)} placeholder="e.g. Dutch-Bangla Bank" />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input value={form.bank_account_name} onChange={e => update("bank_account_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={form.bank_account_number} onChange={e => update("bank_account_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Input value={form.bank_branch} onChange={e => update("bank_branch", e.target.value)} />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Mobile Banking (bKash/Nagad/Rocket)</Label>
              <Input value={form.mobile_banking} onChange={e => update("mobile_banking", e.target.value)} placeholder="e.g. bKash: 01919-060590" />
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <ChangePasswordCard />
      </div>
);
}
