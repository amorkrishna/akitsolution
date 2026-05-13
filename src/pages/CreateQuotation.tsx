import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { Plus, ArrowLeft, Trash2, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { SearchableItemSelect } from "@/components/SearchableItemSelect";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  type: "product" | "service";
  product_id: string | null;
}

export default function CreateQuotation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { settings } = useCompanySettings();
  const [form, setForm] = useState({ client_id: "", notes: "", tax_rate: "0" });
  const [validUntil, setValidUntil] = useState<Date>(addDays(new Date(), 30));
  const [items, setItems] = useState<LineItem[]>([]);
  const [clientMode, setClientMode] = useState<"select" | "type">("select");
  const [typedClientName, setTypedClientName] = useState("");

  useEffect(() => {
    setForm(f => ({ ...f, tax_rate: String(settings.default_tax_rate) }));
  }, [settings.default_tax_rate]);

  const [itemType, setItemType] = useState<"product" | "service" | "custom">("product");
  const [selectedId, setSelectedId] = useState("");
  const [customItem, setCustomItem] = useState({ description: "", quantity: 1, unit_price: 0 });

  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: async () => (await supabase.from("clients").select("id, name")).data || [] });
  const { data: services } = useQuery({
    queryKey: ["services-active"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("id, name, price, category").eq("status", "active").order("name");
      return data || [];
    },
  });
  const { data: products } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, price, category, sku").order("name");
      return data || [];
    },
  });

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxRate = Number(form.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: qtNum } = await supabase.rpc("generate_quotation_number");
      const quotationNumber = qtNum || `QT-${Date.now()}`;

      let clientId: string | null = form.client_id || null;
      if (clientMode === "type" && typedClientName.trim()) {
        const { data: newClient, error: clientError } = await supabase.from("clients").insert({ name: typedClientName.trim() }).select("id").single();
        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      const { data: quotation, error } = await supabase.from("quotations").insert({
        quotation_number: quotationNumber,
        client_id: clientId,
        valid_until: validUntil ? format(validUntil, "yyyy-MM-dd") : null,
        notes: form.notes || null,
        tax_rate: taxRate,
        subtotal,
        tax_amount: taxAmount,
        total,
        status: "draft",
      }).select().single();
      if (error) throw error;

      const lineItems = items.filter(i => i.description).map(i => ({
        quotation_id: quotation.id,
        product_id: i.product_id,
        description: i.type === "product" ? `[Product] ${i.description}` : i.type === "service" ? `[Service] ${i.description}` : i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total: i.quantity * i.unit_price,
      }));
      if (lineItems.length > 0) {
        const { error: itemsError } = await supabase.from("quotation_items").insert(lineItems);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast({ title: "Quotation created successfully" });
      navigate("/quotations");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const addSelectedItem = () => {
    if (itemType === "custom") {
      if (!customItem.description) return;
      setItems([...items, { description: customItem.description, quantity: customItem.quantity, unit_price: customItem.unit_price, type: "product", product_id: null }]);
      setCustomItem({ description: "", quantity: 1, unit_price: 0 });
      return;
    }
    if (!selectedId) return;
    if (itemType === "product") {
      const product = products?.find(p => p.id === selectedId);
      if (product) {
        setItems([...items, { description: product.name, quantity: 1, unit_price: Number(product.price), type: "product", product_id: product.id }]);
      }
    } else {
      const service = services?.find(s => s.id === selectedId);
      if (service) {
        setItems([...items, { description: service.name, quantity: 1, unit_price: Number(service.price), type: "service", product_id: null }]);
      }
    }
    setSelectedId("");
  };

  const currentList = itemType === "product" ? products : services;

  return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quotations")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create Quotation</h1>
            <p className="text-muted-foreground text-sm">Prepare a quotation for CCTV, attendance devices & IT products</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-6">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-lg">Quotation Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <RadioGroup value={clientMode} onValueChange={(v) => { setClientMode(v as "select" | "type"); setForm({ ...form, client_id: "" }); setTypedClientName(""); }} className="flex gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="select" id="client-select" />
                    <Label htmlFor="client-select" className="cursor-pointer font-normal text-xs">Select</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="type" id="client-type" />
                    <Label htmlFor="client-type" className="cursor-pointer font-normal text-xs">Type</Label>
                  </div>
                </RadioGroup>
                {clientMode === "select" ? (
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={typedClientName} onChange={(e) => setTypedClientName(e.target.value)} placeholder="Type client name..." />
                )}
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !validUntil && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validUntil ? format(validUntil, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={validUntil} onSelect={(d) => d && setValidUntil(d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2"><Label>Tax Rate (%)</Label><Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></div>
            </CardContent>
          </Card>

          {/* Summary Card - Moved to Top */}
          <Card className="glass-card">
            <CardContent className="pt-6 space-y-2 text-sm">
              <div className="flex justify-between items-center bg-primary/5 p-3 rounded-xl border border-primary/10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-bold text-primary">Running Total</span>
                </div>
                <span className="text-2xl font-black text-primary">৳{total.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 px-1">
                <div className="flex justify-between border-r border-border/50 pr-4"><span className="text-muted-foreground">Subtotal</span><span className="font-medium text-foreground">৳{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between pl-4"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span className="font-medium text-foreground">৳{taxAmount.toLocaleString()}</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Add Item Form */}
          <Card className="glass-card relative z-20">
            <CardHeader><CardTitle className="text-lg">Add Items from Catalog</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Item Type</Label>
                <RadioGroup value={itemType} onValueChange={(v) => { setItemType(v as "product" | "service" | "custom"); setSelectedId(""); }} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="product" id="type-product" />
                    <Label htmlFor="type-product" className="cursor-pointer font-normal">Product</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="service" id="type-service" />
                    <Label htmlFor="type-service" className="cursor-pointer font-normal">Service</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="custom" id="type-custom" />
                    <Label htmlFor="type-custom" className="cursor-pointer font-normal">Custom</Label>
                  </div>
                </RadioGroup>
              </div>
              {itemType === "custom" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input value={customItem.description} onChange={(e) => setCustomItem({ ...customItem, description: e.target.value })} placeholder="Item description" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input type="number" value={customItem.quantity} onChange={(e) => setCustomItem({ ...customItem, quantity: Number(e.target.value) })} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit Price (৳)</Label>
                      <Input type="number" value={customItem.unit_price} onChange={(e) => setCustomItem({ ...customItem, unit_price: Number(e.target.value) })} className="h-9" />
                    </div>
                  </div>
                  <Button type="button" onClick={addSelectedItem} disabled={!customItem.description}><Plus className="h-4 w-4 mr-1" />Add</Button>
                </div>
              ) : (
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Search & Select {itemType === "product" ? "Product" : "Service"}</Label>
                    <SearchableItemSelect
                      items={(currentList || []).map(i => ({ ...i, price: Number(i.price) }))}
                      value={selectedId}
                      onSelect={setSelectedId}
                      placeholder={`Search ${itemType} by name, SKU, or category...`}
                    />
                  </div>
                  <Button type="button" onClick={addSelectedItem} disabled={!selectedId}><Plus className="h-4 w-4 mr-1" />Add</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Added Items */}
          {items.length > 0 && (
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-lg">Quotation Items ({items.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="border border-border/50 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={item.type === "product" ? "default" : "secondary"} className="text-[10px]">{item.type}</Badge>
                        <span className="font-medium text-sm">{item.description}</span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Unit Price (৳)</Label>
                        <Input type="number" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      Line Total: <span className="font-medium text-foreground">৳{(item.quantity * item.unit_price).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}



          <div className="space-y-2">
            <Label>Notes / Terms & Conditions</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Payment terms, warranty info, installation timeline..." rows={3} />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/quotations")}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || items.length === 0}>
              {createMutation.isPending ? "Creating..." : "Create Quotation"}
            </Button>
          </div>
        </form>
      </div>
);
}
