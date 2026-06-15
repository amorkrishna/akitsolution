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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Plus, ArrowLeft, Trash2, CalendarIcon, Scan } from "lucide-react";
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
  product_id?: string;
  has_serial?: boolean;
  selected_serials?: string[];
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

  const [serialDialogOpen, setSerialDialogOpen] = useState(false);
  const [activeSerialItemIndex, setActiveSerialItemIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isEditMode) {
      setForm(f => ({ ...f, tax_rate: String(settings.default_tax_rate) }));
      
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
          sn: "",
          selected_serials: []
        }]);
        setLoaded(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [settings.default_tax_rate, isEditMode, location.state, loaded]);

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

      // Load items and their assigned serials
      const parsedItems: LineItem[] = [];
      for (const item of (invItems || [])) {
        const isService = item.description?.startsWith("[Service]");
        const cleanDesc = item.description?.replace(/^\[(Service|Product)\]\s*/, "").replace(/\s*\(Warranty:.*?\)$/, "").replace(/\s*\(SN:.*?\)/, "") || item.description;
        const warranty = item.description?.match(/\(Warranty:\s*(.*?)\)/)?.[1] || "";
        const sn = item.description?.match(/\(SN:\s*(.*?)\)/)?.[1] || "";
        
        // Find if any serials were attached to this invoice item
        const { data: attachedSerials } = await supabase.from("product_serials").select("id, product_id").eq("invoice_item_id", item.id);
        
        let productId = undefined;
        let hasSerial = false;
        let selectedSerials: string[] = [];

        if (attachedSerials && attachedSerials.length > 0) {
           productId = attachedSerials[0].product_id;
           hasSerial = true;
           selectedSerials = attachedSerials.map(s => s.id);
        }

        parsedItems.push({
          description: cleanDesc,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          type: isService ? "service" as const : "product" as const,
          warranty,
          sn,
          product_id: productId,
          has_serial: hasSerial,
          selected_serials: selectedSerials
        });
      }
      setItems(parsedItems);
      setLoaded(true);
    };
    loadInvoice();
  }, [editId, loaded, navigate, toast]);

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
      const { data } = await supabase.from("products").select("id, name, price, category, sku, has_serial").order("name");
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
    // Note: If we are in the serial selection dialog, this barcode handler shouldn't trigger, or we should handle it there.
    if (serialDialogOpen) return; 

    const product = products?.find(p => p.sku?.toLowerCase() === sku.toLowerCase() || p.name.toLowerCase() === sku.toLowerCase());
    if (product) {
      setItems(prev => [...prev, { 
        description: product.name, 
        quantity: 1, 
        unit_price: Number(product.price), 
        type: "product", 
        warranty: "", 
        sn: "",
        product_id: product.id,
        has_serial: product.has_serial,
        selected_serials: []
      }]);
      toast({ title: "Product added", description: `${product.name} — ৳${Number(product.price).toLocaleString()}` });
    } else {
      toast({ title: "Product not found", description: `No product found with SKU: ${sku}`, variant: "destructive" });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validation for serial numbers
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.has_serial && (item.selected_serials?.length || 0) !== item.quantity) {
          throw new Error(`Row ${i + 1} (${item.description}): Please select exactly ${item.quantity} serial number(s). You selected ${item.selected_serials?.length || 0}.`);
        }
      }

      let clientId: string | null = form.client_id || null;
      if (clientMode === "type" && typedClientName.trim()) {
        const { data: newClient, error: clientError } = await supabase.from("clients").insert({ name: typedClientName.trim() }).select("id").single();
        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      let currentInvoiceId = editId;

      if (isEditMode && currentInvoiceId) {
        // Update existing invoice
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
        }).eq("id", currentInvoiceId);
        if (error) throw error;

        // Reset serials before deleting invoice items
        const { data: oldItems } = await supabase.from("invoice_items").select("id").eq("invoice_id", currentInvoiceId);
        if (oldItems && oldItems.length > 0) {
          const oldIds = oldItems.map(i => i.id);
          await supabase.from("product_serials").update({ status: 'in_stock', invoice_item_id: null }).in("invoice_item_id", oldIds);
          await supabase.from("invoice_items").delete().eq("invoice_id", currentInvoiceId);
        }
      } else {
        // Create new invoice
        const { data: invNum } = await supabase.rpc("generate_invoice_number");
        const invoiceNumber = invNum || `AK-${Date.now()}`;

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
        currentInvoiceId = invoice.id;
      }

      // Insert line items one by one to capture their IDs and link serials
      for (const item of items) {
        if (!item.description) continue;
        let desc = item.description;
        if (item.type === "service") desc = `[Service] ${desc}`;
        if (item.type === "product") desc = `[Product] ${desc}`;
        // Map actual selected serials to the sn field for backward compatibility/printing
        const serialsText = item.selected_serials?.length ? "See DB" : item.sn; // Will be properly shown via DB relation, but fallback sn text
        if (serialsText) desc += ` (SN: ${serialsText})`;
        if (item.warranty) desc += ` (Warranty: ${item.warranty})`;

        const { data: insertedItem, error: itemsError } = await supabase.from("invoice_items").insert({
          invoice_id: currentInvoiceId!,
          description: desc,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        }).select("id").single();
        
        if (itemsError) throw itemsError;

        // Link serials
        if (item.has_serial && item.selected_serials && item.selected_serials.length > 0) {
          await supabase.from("product_serials").update({ 
            status: 'sold', 
            invoice_item_id: insertedItem.id 
          }).in("id", item.selected_serials);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["product-serials"] });
      toast({ title: isEditMode ? "Invoice updated" : "Invoice created" });
      navigate("/invoices");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    // If quantity changes, ensure serials aren't more than quantity
    if (field === 'quantity' && updated[idx].selected_serials) {
       if (updated[idx].selected_serials!.length > value) {
         updated[idx].selected_serials = updated[idx].selected_serials!.slice(0, value);
       }
    }
    setItems(updated);
  };

  const openSerialDialog = (idx: number) => {
    setActiveSerialItemIndex(idx);
    setSerialDialogOpen(true);
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl mx-auto pb-12 animate-fade-in">
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
                      setItems([...items, { 
                        description: product.name, 
                        quantity: 1, 
                        unit_price: Number(product.price), 
                        type: "product", 
                        warranty: "", 
                        sn: "",
                        product_id: product.id,
                        has_serial: product.has_serial,
                        selected_serials: []
                      }]);
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
            {/* Desktop Headers */}
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
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    <div className="col-span-1 lg:col-span-2">
                      <Select value={item.type} onValueChange={(v) => updateItem(idx, "type", v)}>
                        <SelectTrigger className="h-9 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 lg:col-span-3">
                      <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Item description" className="h-9 bg-background" />
                    </div>
                    <div className="col-span-1 lg:col-span-2">
                      {item.has_serial ? (
                        <Button 
                          type="button" 
                          variant={(item.selected_serials?.length || 0) === item.quantity ? "outline" : "destructive"} 
                          className="h-9 w-full text-xs font-medium"
                          onClick={() => openSerialDialog(idx)}
                        >
                          <Scan className="w-3 h-3 mr-1" />
                          Serials ({item.selected_serials?.length || 0}/{item.quantity})
                        </Button>
                      ) : (
                        <Input value={item.sn} onChange={(e) => updateItem(idx, "sn", e.target.value)} placeholder="Serial No." className="h-9 bg-background" />
                      )}
                    </div>
                    <div className="col-span-1">
                      <Input type="number" min={1} value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="h-9 text-center bg-background px-1" />
                    </div>
                    <div className="col-span-1 lg:col-span-2 relative">
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
                </div>
              ))}
              {items.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <Plus className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  Add an item to get started
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-border/50 pt-6">
          <div className="w-full sm:w-1/2">
            <Label className="text-sm font-semibold">Additional Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Thank you for your business!" className="mt-2 bg-background/50 h-20 resize-none" />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button type="button" variant="outline" onClick={() => navigate("/invoices")} className="flex-1 sm:flex-none h-12 px-6">Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending || items.length === 0} className="flex-1 sm:flex-none h-12 px-8 font-bold text-md shadow-lg shadow-primary/20">
              {saveMutation.isPending ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </div>
      </form>

      <SerialSelectionDialog 
        open={serialDialogOpen} 
        onOpenChange={setSerialDialogOpen} 
        item={activeSerialItemIndex !== null ? items[activeSerialItemIndex] : null}
        editId={editId}
        onSave={(newSerials) => {
          if (activeSerialItemIndex !== null) {
            updateItem(activeSerialItemIndex, "selected_serials", newSerials);
          }
        }}
      />
    </div>
  );
}

function SerialSelectionDialog({ open, onOpenChange, item, editId, onSave }: { open: boolean, onOpenChange: (o: boolean) => void, item: LineItem | null, editId?: string, onSave: (s: string[]) => void }) {
  const [tempSerials, setTempSerials] = useState<string[]>([]);
  
  useEffect(() => {
    if (open && item) {
      setTempSerials(item.selected_serials || []);
    }
  }, [open, item]);

  const { data: availableSerials = [], isLoading } = useQuery({
    queryKey: ["product-serials-invoice", item?.product_id],
    enabled: open && !!item?.product_id,
    queryFn: async () => {
      let query = supabase.from("product_serials").select("*").eq("product_id", item!.product_id);
      
      // If editing an invoice, fetch serials that are already attached to ANY item in this invoice
      if (editId) {
        // Technically we should check if invoice_item_id belongs to this invoice.
        // For simplicity, we just fetch all in_stock and then we'll also fetch the specific ones attached to THIS item later if needed.
        // Actually, earlier in CreateInvoice we attached the already selected serials to the state.
        // We can just fetch 'in_stock' and merge with currently selected ones.
        query = query.eq("status", "in_stock");
      } else {
        query = query.eq("status", "in_stock");
      }
      
      const { data } = await query;
      return data || [];
    }
  });

  // We must also include serials that were already attached to this item before
  // (e.g. if we are editing an invoice, the attached serials have status='sold', so they won't show up in the query above).
  // We can fetch them individually, or just accept that they are in the `tempSerials` but we don't know their serial_number text.
  // To fix this, let's fetch the actual serial_number texts for tempSerials.
  const { data: currentSerialsDetails } = useQuery({
    queryKey: ["product-serials-details", tempSerials],
    enabled: open && tempSerials.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("product_serials").select("id, serial_number").in("id", tempSerials);
      return data || [];
    }
  });

  if (!item) return null;

  // Merge available with currently selected ones
  const allSerialsToShow = [...availableSerials];
  if (currentSerialsDetails) {
    currentSerialsDetails.forEach(cs => {
      if (!allSerialsToShow.find(s => s.id === cs.id)) {
        allSerialsToShow.push(cs);
      }
    });
  }

  const handleToggle = (id: string) => {
    if (tempSerials.includes(id)) {
      setTempSerials(tempSerials.filter(s => s !== id));
    } else {
      if (tempSerials.length >= item.quantity) {
        toast({ title: "Limit reached", description: `You only need ${item.quantity} serial(s).`, variant: "destructive" });
        return;
      }
      setTempSerials([...tempSerials, id]);
    }
  };

  const handleBarcodeDetected = (skuOrSn: string) => {
    const serial = allSerialsToShow.find((s: any) => s.serial_number === skuOrSn);
    if (serial) {
      if (!tempSerials.includes(serial.id)) {
        if (tempSerials.length >= item.quantity) {
          toast({ title: "Limit reached", description: `You only need ${item.quantity} serial(s).`, variant: "destructive" });
        } else {
          setTempSerials([...tempSerials, serial.id]);
        }
      }
    } else {
      toast({ title: "Not found", description: `Serial ${skuOrSn} not found in stock.`, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Serials for {item.description}</DialogTitle>
        </DialogHeader>
        
        <div className="bg-primary/5 rounded-md p-3 mb-2">
          <span className="text-xs font-semibold flex items-center mb-2"><Scan className="w-3 h-3 mr-1" /> Scan Serial</span>
          <BarcodeScanner onBarcodeDetected={handleBarcodeDetected} />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-sm">Available Serials</Label>
            <Badge variant="outline">{tempSerials.length} / {item.quantity} Selected</Badge>
          </div>
          
          <div className="bg-muted/30 border rounded-lg p-3 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground p-4">Loading...</div>
            ) : allSerialsToShow.length === 0 ? (
              <div className="text-center text-sm text-destructive p-4">No serials available in stock.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allSerialsToShow.map(s => {
                  const isSelected = tempSerials.includes(s.id);
                  return (
                    <Badge 
                      key={s.id} 
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer ${isSelected ? 'bg-primary' : 'hover:border-primary/50 text-muted-foreground'}`}
                      onClick={() => handleToggle(s.id)}
                    >
                      {s.serial_number}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSave(tempSerials); onOpenChange(false); }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
