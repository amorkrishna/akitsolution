import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
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
import { format } from "date-fns";
import { Plus, ArrowLeft, Trash2, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { SearchableItemSelect } from "@/components/SearchableItemSelect";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  type: "product" | "service";
  warranty: string;
  sn: string;
}

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { settings } = useCompanySettings();
  const [form, setForm] = useState({ client_id: "", status: "draft", notes: "", tax_rate: "0", invoice_number: "" });
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [items, setItems] = useState<LineItem[]>([]);
  const [clientMode, setClientMode] = useState<"select" | "type">("select");
  const [typedClientName, setTypedClientName] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isEditMode) {
      setForm(f => ({ ...f, tax_rate: String(settings.default_tax_rate) }));
    }
  }, [settings.default_tax_rate, isEditMode]);

  // Load existing invoice for edit mode
  useEffect(() => {
    if (!editId || loaded) return;
    const loadInvoice = async () => {
      const { data: inv } = await supabase.from("invoices").select("*, clients(name)").eq("id", editId).single();
      if (!inv) { toast({ title: "Invoice not found", variant: "destructive" }); navigate("/invoices"); return; }
      const { data: invItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", editId);

      setForm({
        client_id: inv.client_id || "",
        status: inv.status,
        notes: inv.notes || "",
        tax_rate: String(inv.tax_rate),
        invoice_number: inv.invoice_number,
      });
      if (inv.due_date) setDueDate(new Date(inv.due_date));
      if (inv.client_id) setClientMode("select");

      // Parse items back
      const parsedItems: LineItem[] = (invItems || []).map((item: any) => {
        const isService = item.description?.startsWith("[Service]");
        const isProduct = item.description?.startsWith("[Product]");
        const cleanDesc = item.description?.replace(/^\[(Service|Product)\]\s*/, "").replace(/\s*\(Warranty:.*?\)$/, "").replace(/\s*\(SN:.*?\)/, "") || item.description;
        const warranty = item.description?.match(/\(Warranty:\s*(.*?)\)/)?.[1] || "";
        const sn = item.description?.match(/\(SN:\s*(.*?)\)/)?.[1] || "";
        return {
          description: cleanDesc,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          type: isService ? "service" as const : "product" as const,
          warranty,
          sn,
        };
      });
      setItems(parsedItems);
      setLoaded(true);
    };
    loadInvoice();
  }, [editId, loaded, navigate, toast]);

  // Add item form state
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

  const handleBarcodeDetected = (sku: string) => {
    const product = products?.find(p => p.sku?.toLowerCase() === sku.toLowerCase() || p.name.toLowerCase() === sku.toLowerCase());
    if (product) {
      setItems(prev => [...prev, { description: product.name, quantity: 1, unit_price: Number(product.price), type: "product", warranty: "", sn: "" }]);
      toast({ title: "Product added", description: `${product.name} — ৳${Number(product.price).toLocaleString()}` });
    } else {
      toast({ title: "Product not found", description: `No product found with SKU: ${sku}`, variant: "destructive" });
    }
  };

  const buildLineItems = (invoiceId: string) => {
    return items.filter(i => i.description).map(i => {
      let desc = i.description;
      if (i.type === "service") desc = `[Service] ${desc}`;
      if (i.type === "product") desc = `[Product] ${desc}`;
      if (i.sn) desc += ` (SN: ${i.sn})`;
      if (i.warranty) desc += ` (Warranty: ${i.warranty})`;
      return {
        invoice_id: invoiceId,
        description: desc,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total: i.quantity * i.unit_price,
      };
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEditMode && editId) {
        // Update existing invoice
        let clientId: string | null = form.client_id || null;
        if (clientMode === "type" && typedClientName.trim()) {
          const { data: newClient, error: clientError } = await supabase.from("clients").insert({ name: typedClientName.trim() }).select("id").single();
          if (clientError) throw clientError;
          clientId = newClient.id;
        }

        const { error } = await supabase.from("invoices").update({
          client_id: clientId,
          status: form.status,
          due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
          notes: form.notes || null,
          tax_rate: taxRate,
          subtotal,
          tax_amount: taxAmount,
          total,
        }).eq("id", editId);
        if (error) throw error;

        // Delete old items and re-insert
        await supabase.from("invoice_items").delete().eq("invoice_id", editId);
        const lineItems = buildLineItems(editId);
        if (lineItems.length > 0) {
          const { error: itemsError } = await supabase.from("invoice_items").insert(lineItems);
          if (itemsError) throw itemsError;
        }
      } else {
        // Create new invoice
        const { data: invNum } = await supabase.rpc("generate_invoice_number");
        const invoiceNumber = invNum || `AK-${Date.now()}`;

        let clientId: string | null = form.client_id || null;
        if (clientMode === "type" && typedClientName.trim()) {
          const { data: newClient, error: clientError } = await supabase.from("clients").insert({ name: typedClientName.trim() }).select("id").single();
          if (clientError) throw clientError;
          clientId = newClient.id;
        }

        const { data: invoice, error } = await supabase.from("invoices").insert({
          invoice_number: invoiceNumber,
          client_id: clientId,
          project_id: null,
          status: form.status,
          due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
          notes: form.notes || null,
          tax_rate: taxRate,
          subtotal,
          tax_amount: taxAmount,
          total,
        }).select().single();
        if (error) throw error;

        const lineItems = buildLineItems(invoice.id);
        if (lineItems.length > 0) {
          const { error: itemsError } = await supabase.from("invoice_items").insert(lineItems);
          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: isEditMode ? "Invoice updated" : "Invoice created" });
      navigate("/invoices");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const addSelectedItem = async () => {
    if (itemType === "custom") {
      if (!customItem.description) return;
      setItems([...items, { description: customItem.description, quantity: customItem.quantity, unit_price: customItem.unit_price, type: "product", warranty: "", sn: "" }]);
      // Auto-add custom product to the Products list
      const { error } = await supabase.from("products").insert({
        name: customItem.description,
        price: customItem.unit_price,
        category: "Other",
        stock_quantity: 0,
      });
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["products-list"] });
        toast({ title: "Product auto-added", description: `"${customItem.description}" saved to Products list` });
      }
      setCustomItem({ description: "", quantity: 1, unit_price: 0 });
      return;
    }
    if (!selectedId) return;
    if (itemType === "product") {
      const product = products?.find(p => p.id === selectedId);
      if (product) {
        setItems([...items, { description: product.name, quantity: 1, unit_price: Number(product.price), type: "product", warranty: "", sn: "" }]);
      }
    } else {
      const service = services?.find(s => s.id === selectedId);
      if (service) {
        setItems([...items, { description: service.name, quantity: 1, unit_price: Number(service.price), type: "service", warranty: "", sn: "" }]);
      }
    }
    setSelectedId("");
  };

  const currentList = itemType === "product" ? products : services;

  return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{isEditMode ? "Edit Invoice" : "Create Invoice"}</h1>
            <p className="text-muted-foreground text-sm">
              {isEditMode ? `Editing ${form.invoice_number}` : "Fill in the details to generate a new invoice"}
            </p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-6">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-lg">Invoice Details</CardTitle></CardHeader>
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
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={(d) => d && setDueDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2"><Label>Tax Rate (%)</Label><Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="sent">Sent (Unpaid)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

          {/* Barcode Scanner */}
          <BarcodeScanner onBarcodeDetected={handleBarcodeDetected} />

          {/* Add Item Form */}
          <Card className="glass-card relative z-20">
            <CardHeader><CardTitle className="text-lg">Add Line Item</CardTitle></CardHeader>
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

          {/* Added Items List */}
          {items.length > 0 && (
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-lg">Invoice Items ({items.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="border border-border/50 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={item.type === "product" ? "default" : "secondary"} className="text-[10px]">
                          {item.type}
                        </Badge>
                        <span className="font-medium text-sm">{item.description}</span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">SN</Label>
                        <Input value={item.sn} onChange={(e) => updateItem(idx, "sn", e.target.value)} placeholder="Serial No." className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Unit Price (৳)</Label>
                        <Input type="number" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} className="h-8 text-sm" />
                      </div>
                      {item.type === "product" && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Warranty</Label>
                          <Input value={item.warranty} onChange={(e) => updateItem(idx, "warranty", e.target.value)} placeholder="e.g. 1 Year" className="h-8 text-sm" />
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      Line Total: <span className="font-medium text-foreground">৳{(item.quantity * item.unit_price).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, bank details, etc." /></div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending || items.length === 0}>
              {isEditMode ? "Update Invoice" : "Generate Invoice"}
            </Button>
          </div>
        </form>
      </div>
);
}
