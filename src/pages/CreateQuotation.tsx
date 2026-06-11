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
  warranty: string;
}

export default function CreateQuotation() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { settings } = useCompanySettings();
  const [form, setForm] = useState({ client_id: "", notes: "", tax_rate: "0", quotation_number: "" });
  const [validUntil, setValidUntil] = useState<Date>(addDays(new Date(), 30));
  const [items, setItems] = useState<LineItem[]>([]);
  const [clientMode, setClientMode] = useState<"select" | "type">("select");
  const [typedClientName, setTypedClientName] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isEditMode) {
      setForm(f => ({ ...f, tax_rate: String(settings.default_tax_rate) }));
    }
  }, [settings.default_tax_rate, isEditMode]);

  useEffect(() => {
    if (!editId || loaded) return;
    const loadQuotation = async () => {
      const { data: q } = await supabase.from("quotations").select("*, clients(name)").eq("id", editId).single();
      if (!q) { toast({ title: "Quotation not found", variant: "destructive" }); navigate("/quotations"); return; }
      const { data: qItems } = await supabase.from("quotation_items").select("*").eq("quotation_id", editId);

      setForm({
        client_id: q.client_id || "",
        notes: q.notes || "",
        tax_rate: String(q.tax_rate),
        quotation_number: q.quotation_number,
      });
      if (q.valid_until) setValidUntil(new Date(q.valid_until));
      if (q.client_id) setClientMode("select");

      const parsedItems: LineItem[] = (qItems || []).map((item: any) => {
        const isService = item.description?.startsWith("[Service]");
        const isProduct = item.description?.startsWith("[Product]");
        const cleanDesc = item.description?.replace(/^\[(Service|Product)\]\s*/, "").replace(/\s*\(Warranty:.*?\)$/, "") || item.description;
        const warranty = item.description?.match(/\(Warranty:\s*(.*?)\)/)?.[1] || "";
        return {
          description: cleanDesc,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          type: isService ? "service" as const : "product" as const,
          warranty,
        };
      });
      setItems(parsedItems);
      setLoaded(true);
    };
    loadQuotation();
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
      const { data } = await supabase.from("products").select("id, name, price, category, sku").order("name");
      return data || [];
    },
  });

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxRate = Number(form.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const saveMutation = useMutation({
    mutationFn: async () => {
      let clientId: string | null = form.client_id || null;
      if (clientMode === "type" && typedClientName.trim()) {
        const { data: newClient, error: clientError } = await supabase.from("clients").insert({ name: typedClientName.trim() }).select("id").single();
        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      const quotationData = {
        client_id: clientId,
        valid_until: validUntil ? format(validUntil, "yyyy-MM-dd") : null,
        notes: form.notes || null,
        tax_rate: taxRate,
        subtotal,
        tax_amount: taxAmount,
        total,
      };

      let qId = editId;

      if (isEditMode) {
        const { error } = await supabase.from("quotations").update(quotationData).eq("id", editId);
        if (error) throw error;
        await supabase.from("quotation_items").delete().eq("quotation_id", editId);
      } else {
        const { data: qtNum } = await supabase.rpc("generate_quotation_number");
        const quotationNumber = qtNum || `QT-${Date.now()}`;
        const { data: quotation, error } = await supabase.from("quotations").insert({
          ...quotationData,
          quotation_number: quotationNumber,
          status: "draft",
        }).select().single();
        if (error) throw error;
        qId = quotation.id;
      }

      const lineItems = items.filter(i => i.description).map(i => {
        let desc = i.type === "product" ? `[Product] ${i.description}` : i.type === "service" ? `[Service] ${i.description}` : i.description;
        if (i.warranty) desc += ` (Warranty: ${i.warranty})`;
        return {
          quotation_id: qId,
          description: desc,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total: i.quantity * i.unit_price,
        };
      });

      if (lineItems.length > 0) {
        const { error: itemsError } = await supabase.from("quotation_items").insert(lineItems);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast({ title: isEditMode ? "Quotation updated" : "Quotation created successfully" });
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

  return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quotations")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{isEditMode ? `Edit Quotation ${form.quotation_number}` : "Create Quotation"}</h1>
            <p className="text-muted-foreground text-sm">Prepare a quotation for CCTV, attendance devices & IT products</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-6">
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

          {/* Summary Card */}
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

          {/* Spreadsheet Line Items */}
          <Card className="glass-card relative z-20">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-lg">Line Items</CardTitle>
              <div className="flex items-center gap-2">
                <div className="w-64">
                  <SearchableItemSelect
                    items={[...(products || []), ...(services || [])].map(i => ({ ...i, price: Number(i.price) }))}
                    value=""
                    onSelect={(id) => {
                      const product = products?.find(p => p.id === id);
                      const service = services?.find(s => s.id === id);
                      if (product) {
                        setItems([...items, { description: product.name, quantity: 1, unit_price: Number(product.price), type: "product", warranty: "" }]);
                      } else if (service) {
                        setItems([...items, { description: service.name, quantity: 1, unit_price: Number(service.price), type: "service", warranty: "" }]);
                      }
                      toast({ title: "Item added from catalog" });
                    }}
                    placeholder="Quick add from catalog..."
                  />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  setItems([...items, { description: "", quantity: 1, unit_price: 0, type: "product", warranty: "" }]);
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Blank Row
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium min-w-[200px]">Description</th>
                    <th className="px-4 py-3 font-medium w-[80px]">Qty</th>
                    <th className="px-4 py-3 font-medium w-[120px]">Unit Price</th>
                    <th className="px-4 py-3 font-medium min-w-[120px]">Warranty</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2">
                        <Select value={item.type} onValueChange={(v) => updateItem(idx, "type", v)}>
                          <SelectTrigger className="h-8 text-xs w-[90px] border-transparent bg-transparent hover:bg-muted"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Item description" className="h-8 text-sm border-transparent bg-transparent hover:bg-muted focus:bg-background" />
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" value={item.quantity === 0 ? "" : item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="h-8 text-sm border-transparent bg-transparent hover:bg-muted focus:bg-background px-2" />
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" value={item.unit_price === 0 ? "" : item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} className="h-8 text-sm border-transparent bg-transparent hover:bg-muted focus:bg-background px-2" />
                      </td>
                      <td className="px-4 py-2">
                        <Input value={item.warranty} onChange={(e) => updateItem(idx, "warranty", e.target.value)} placeholder="e.g. 1 Yr" className="h-8 text-sm border-transparent bg-transparent hover:bg-muted focus:bg-background disabled:opacity-50" disabled={item.type === "service"} />
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        ৳{(item.quantity * item.unit_price).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No items added yet. Search the catalog or add a blank row.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="p-3 border-t bg-muted/10 flex justify-center">
                <Button type="button" variant="ghost" size="sm" className="text-primary text-xs" onClick={() => {
                  setItems([...items, { description: "", quantity: 1, unit_price: 0, type: "product", warranty: "" }]);
                }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Blank Row
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Notes / Terms & Conditions</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Payment terms, warranty info, installation timeline..." rows={3} />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/quotations")}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending || items.length === 0}>
              {saveMutation.isPending ? "Saving..." : isEditMode ? "Update Quotation" : "Create Quotation"}
            </Button>
          </div>
        </form>
      </div>
  );
}
