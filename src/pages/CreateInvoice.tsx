import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
  const [form, setForm] = useState({ client_id: "", status: "draft", notes: "", tax_rate: "0", invoice_number: "", paid_amount: "0" });
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [items, setItems] = useState<LineItem[]>([]);
  const [clientMode, setClientMode] = useState<"select" | "type">("select");
  const [typedClientName, setTypedClientName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!isEditMode) {
      setForm(f => ({ ...f, tax_rate: String(settings.default_tax_rate) }));
      
      // Handle pre-fill from Servicing
      if (location.state?.fromServicing && !loaded) {
        const rec = location.state.servicingRecord;
        setClientMode("type");
        setTypedClientName(rec.client_name);
        setItems([{
          description: rec.description,
          quantity: 1,
          unit_price: rec.amount,
          type: "service",
          warranty: "",
          sn: ""
        }]);
        setLoaded(true);
        // Clear state so it doesn't persist on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [settings.default_tax_rate, isEditMode, location.state, loaded]);

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
        paid_amount: String(inv.paid_amount || 0),
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

  // Add item form state removed as we use inline spreadsheet now

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
  const paidAmount = Number(form.paid_amount) || 0;
  const dueAmount = Math.max(0, total - paidAmount);

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
          paid_amount: paidAmount,
        }).eq("id", editId);
        if (error) throw error;

        // Delete old items and re-insert
        const { error: deleteError } = await supabase.from("invoice_items").delete().eq("invoice_id", editId);
        if (deleteError) throw deleteError;
        
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
          paid_amount: paidAmount,
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

  // Unused logic removed

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")} className="hover:bg-primary/10 hover:text-primary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            {isEditMode ? "Edit Invoice" : "Create Invoice"}
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            {isEditMode ? `Editing ${form.invoice_number}` : "Fill in the details to generate a professional invoice"}
          </p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-6 md:space-y-8">
        
        {/* Top Grid: Details & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          <Card className="glass-card lg:col-span-2 border-primary/10 shadow-lg shadow-primary/5">
            <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
              <CardTitle className="text-lg">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Client Details</Label>
                <div className="bg-muted/30 p-3 rounded-lg border border-border/50 space-y-3">
                  <RadioGroup value={clientMode} onValueChange={(v) => { setClientMode(v as "select" | "type"); setForm({ ...form, client_id: "" }); setTypedClientName(""); }} className="flex gap-6 mb-1">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="select" id="client-select" />
                      <Label htmlFor="client-select" className="cursor-pointer font-medium text-xs">Select Existing</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="type" id="client-type" />
                      <Label htmlFor="client-type" className="cursor-pointer font-medium text-xs">Type New</Label>
                    </div>
                  </RadioGroup>
                  {clientMode === "select" ? (
                    <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input value={typedClientName} onChange={(e) => setTypedClientName(e.target.value)} placeholder="Type client name..." className="bg-background" />
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-background", !dueDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dueDate} onSelect={(d) => d && setDueDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">Tax Rate (%)</Label>
                    <Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">Advance Paid (৳)</Label>
                    <Input type="number" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="border-primary/20 shadow-xl shadow-primary/10 relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Plus className="w-24 h-24 text-primary" />
            </div>
            <CardContent className="p-6 h-full flex flex-col justify-center space-y-6 relative z-10">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Amount</p>
                <div className="text-4xl md:text-5xl font-black text-primary tracking-tight">
                  ৳{total.toLocaleString()}
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-primary/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Subtotal</span>
                  <span className="font-bold">৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Tax ({taxRate}%)</span>
                  <span className="font-bold text-accent">৳{taxAmount.toLocaleString()}</span>
                </div>
                {paidAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Advance Paid</span>
                    <span className="font-bold text-emerald-600">- ৳{paidAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-base pt-2 border-t border-primary/10">
                  <span className="text-muted-foreground font-semibold">Due Amount</span>
                  <span className="font-bold text-destructive">৳{dueAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        <BarcodeScanner onBarcodeDetected={handleBarcodeDetected} />

        {/* Line Items Section - Mobile Friendly */}
        <Card className="glass-card shadow-lg shadow-primary/5 border-primary/10 relative z-20">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 border-b border-border/50 bg-muted/20 gap-4">
            <CardTitle className="text-lg">Line Items</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-64">
                <SearchableItemSelect
                  items={[...(products || []), ...(services || [])].map(i => ({ ...i, price: Number(i.price) }))}
                  value=""
                  onSelect={(id) => {
                    const product = products?.find(p => p.id === id);
                    const service = services?.find(s => s.id === id);
                    if (product) {
                      setItems([...items, { description: product.name, quantity: 1, unit_price: Number(product.price), type: "product", warranty: "", sn: "" }]);
                    } else if (service) {
                      setItems([...items, { description: service.name, quantity: 1, unit_price: Number(service.price), type: "service", warranty: "", sn: "" }]);
                    }
                    toast({ title: "Item added from catalog" });
                  }}
                  placeholder="Search catalog to add..."
                />
              </div>
              <Button type="button" variant="default" size="sm" onClick={() => {
                setItems([...items, { description: "", quantity: 1, unit_price: 0, type: "product", warranty: "", sn: "" }]);
              }} className="shadow-md">
                <Plus className="h-4 w-4 mr-1" /> Add Row
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Headers (Hidden on Mobile) */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b">
              <div className="col-span-2">Type</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-2">S/N</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-1 text-center">Warranty</div>
              <div className="col-span-1 text-center"></div>
            </div>

            <div className="divide-y divide-border/50">
              {items.map((item, idx) => (
                <div key={idx} className="p-4 lg:p-0 lg:px-6 lg:py-3 hover:bg-muted/10 transition-colors">
                  {/* Desktop Row View */}
                  <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2">
                      <Select value={item.type} onValueChange={(v) => updateItem(idx, "type", v)}>
                        <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Item description" className="h-9 bg-background" />
                    </div>
                    <div className="col-span-2">
                      <Input value={item.sn} onChange={(e) => updateItem(idx, "sn", e.target.value)} placeholder="Serial No." className="h-9 bg-background" />
                    </div>
                    <div className="col-span-1">
                      <Input type="number" value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="h-9 text-center bg-background px-1" />
                    </div>
                    <div className="col-span-2 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">৳</span>
                      <Input type="number" value={item.unit_price === 0 ? "" : item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} className="h-9 text-right pl-6 pr-2 bg-background font-medium" />
                    </div>
                    <div className="col-span-1">
                      <Input value={item.warranty} onChange={(e) => updateItem(idx, "warranty", e.target.value)} placeholder="1 Yr" className="h-9 text-center bg-background disabled:opacity-50" disabled={item.type === "service"} />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden relative pt-2">
                    <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-background shadow-sm border" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Item description" className="h-10 bg-background text-base" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <Select value={item.type} onValueChange={(v) => updateItem(idx, "type", v)}>
                        <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Serial No.</Label>
                      <Input value={item.sn} onChange={(e) => updateItem(idx, "sn", e.target.value)} placeholder="S/N" className="h-10 bg-background" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:col-span-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Input type="number" value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="h-10 text-center bg-background text-lg font-medium" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Unit Price (৳)</Label>
                        <Input type="number" value={item.unit_price === 0 ? "" : item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} className="h-10 text-right bg-background text-lg font-medium" />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Warranty</Label>
                      <Input value={item.warranty} onChange={(e) => updateItem(idx, "warranty", e.target.value)} placeholder="e.g. 1 Yr" className="h-10 bg-background disabled:opacity-50" disabled={item.type === "service"} />
                    </div>

                    <div className="sm:col-span-2 flex justify-between items-center p-3 mt-2 bg-primary/5 rounded-lg border border-primary/10">
                      <span className="text-sm font-semibold text-primary">Row Total</span>
                      <span className="text-lg font-bold text-primary">৳{(item.quantity * item.unit_price).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <div className="p-4 bg-muted/30 rounded-full mb-3">
                    <Plus className="h-8 w-8 opacity-20" />
                  </div>
                  <p className="font-medium">No items added yet</p>
                  <p className="text-sm mt-1">Search the catalog or add a blank row to get started.</p>
                </div>
              )}
            </div>
            {items.length > 0 && (
              <div className="p-4 border-t bg-muted/10 flex justify-center">
                <Button type="button" variant="outline" size="sm" className="text-primary hover:text-primary/80 bg-background shadow-sm" onClick={() => {
                  setItems([...items, { description: "", quantity: 1, unit_price: 0, type: "product", warranty: "", sn: "" }]);
                }}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Another Row
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card shadow-md border-border/50">
          <CardContent className="p-6">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Additional Notes</Label>
              <Textarea 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                placeholder="Payment terms, bank details, or a thank you message..." 
                className="min-h-[100px] resize-y bg-background text-base"
              />
            </div>
          </CardContent>
        </Card>

        <div className="pb-8">
          <Button type="submit" size="lg" className="w-full text-lg h-14 font-bold shadow-xl shadow-primary/20" disabled={saveMutation.isPending || items.length === 0}>
            {isEditMode ? "Update Invoice & Save" : "Generate Invoice Now"}
          </Button>
        </div>
      </form>
    </div>
  );
}
