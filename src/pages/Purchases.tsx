import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, ShoppingCart, Scan, UploadCloud, Loader2, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { format } from "date-fns";
import { BarcodeScanner } from "@/components/BarcodeScanner";

export default function Purchases() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [supplierName, setSupplierName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [notes, setNotes] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);

  // Cart State
  const [cart, setCart] = useState<any[]>([]);
  const [currentProductId, setCurrentProductId] = useState("");
  const [currentQty, setCurrentQty] = useState(1);
  const [currentUnitCost, setCurrentUnitCost] = useState(0);

  const [isParsingBill, setIsParsingBill] = useState(false);

  const { data: purchases, isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select(`
          *,
          purchase_items (
            quantity,
            unit_price,
            total_price,
            products (name, id, has_serial)
          )
        `)
        .order("purchase_date", { ascending: false });
      
      if (error) {
        console.error("Error fetching purchases:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("id, name, price, sku, stock_quantity, has_serial")).data || [],
  });

  const addToCart = () => {
    if (!currentProductId) return;
    const product = products?.find((p: any) => p.id === currentProductId);
    if (!product) return;

    const existingItemIndex = cart.findIndex((item) => item.product_id === currentProductId);
    const newItem = {
      product_id: currentProductId,
      product_name: product.name,
      has_serial: product.has_serial,
      quantity: currentQty,
      unit_price: currentUnitCost,
      total_price: currentQty * currentUnitCost,
      serials: []
    };

    if (existingItemIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += currentQty;
      updatedCart[existingItemIndex].total_price = updatedCart[existingItemIndex].quantity * currentUnitCost;
      setCart(updatedCart);
    } else {
      setCart([...cart, newItem]);
    }

    setCurrentProductId("");
    setCurrentQty(1);
    setCurrentUnitCost(0);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleSerialsChange = (index: number, text: string) => {
    const newCart = [...cart];
    newCart[index].serials = text.split(',').map(s => s.trim()).filter(s => s);
    setCart(newCart);
  };

  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsParsingBill(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Str = (reader.result as string).split(',')[1];
        
        toast({ title: "Analyzing bill with AI...", description: "This might take a few seconds." });
        
        const existingProductsList = products?.map(p => ({ id: p.id, name: p.name, category: p.category })) || [];
        
        const { data, error } = await supabase.functions.invoke("parse-purchase-bill", {
          body: { imageBase64: base64Str, mimeType: file.type, existingProducts: existingProductsList }
        });
        
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        
        const aiData = data.data;
        if (aiData.supplier_name) setSupplierName(aiData.supplier_name);
        if (aiData.purchase_date) setPurchaseDate(aiData.purchase_date);
        
        const newCartItems = aiData.items.map((item: any) => {
          let matchedProduct;
          if (item.product_id) {
            matchedProduct = products?.find((p: any) => p.id === item.product_id);
          } else {
            // Fallback fuzzy match
            matchedProduct = products?.find((p: any) => p.name.toLowerCase().includes(item.product_name.toLowerCase()));
          }
          
          return {
            product_id: matchedProduct?.id || "", // Empty if not found, forces user to link
            product_name: matchedProduct?.name || item.product_name + " (Needs linking)",
            ai_guessed_category: item.category || "Uncategorized",
            has_serial: matchedProduct?.has_serial || false,
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total_price: item.total_price || ((item.quantity || 1) * (item.unit_price || 0)),
            serials: []
          };
        });
        
        setCart([...cart, ...newCartItems]);
        toast({ title: "Bill parsed successfully!", description: "Please review and link any unlinked products." });
      };
    } catch (err: any) {
      toast({ title: "Failed to parse bill", description: err.message, variant: "destructive" });
    } finally {
      setIsParsingBill(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateNewProduct = async (idx: number, name: string, price: number) => {
    try {
      const cleanName = name.replace(" (Needs linking)", "");
      const itemCategory = (cart[idx] as any)?.ai_guessed_category || "Uncategorized";
      
      const { data, error } = await supabase.from("products").insert({
        name: cleanName,
        category: itemCategory,
        price: price,
        stock_quantity: 0,
        show_in_store: false
      }).select().single();

      if (error) throw error;
      
      toast({ title: "Product Created", description: `Created new product: ${cleanName}` });
      
      queryClient.invalidateQueries({ queryKey: ["products"] });

      const newCart = [...cart];
      newCart[idx].product_id = data.id;
      newCart[idx].product_name = data.name;
      newCart[idx].has_serial = data.has_serial;
      setCart(newCart);

    } catch (err: any) {
      toast({ title: "Error creating product", description: err.message, variant: "destructive" });
    }
  };


  const cartTotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const dueAmount = cartTotal - paidAmount;

  const savePurchase = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Please add at least one product to the purchase");
      if (!supplierName) throw new Error("Supplier name is required");
      if (cart.some(c => !c.product_id)) throw new Error("All items must be linked to a real product before saving.");

      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        supplier_name: supplierName,
        total_cost: cartTotal,
        paid_amount: paidAmount,
        purchase_date: purchaseDate,
        payment_status: paymentStatus,
        notes: notes || null,
        created_by: user?.id || null,
      };

      if (editId) {
        const { error } = await supabase.from("purchases").update(payload).eq("id", editId);
        if (error) throw error;

        await supabase.from("purchase_items").delete().eq("purchase_id", editId);
        await supabase.from("product_serials").delete().eq("purchase_id", editId);
        
        const itemsPayload = cart.map(item => ({
          purchase_id: editId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }));
        await supabase.from("purchase_items").insert(itemsPayload);

        // Insert Serials
        const serialsPayload = cart.flatMap(item => 
          item.serials.map((sn: string) => ({
            purchase_id: editId,
            product_id: item.product_id,
            serial_number: sn,
            status: 'in_stock'
          }))
        );
        if (serialsPayload.length > 0) {
          await supabase.from("product_serials").insert(serialsPayload);
        }

      } else {
        const { data, error } = await supabase.from("purchases").insert(payload).select().single();
        if (error) throw error;

        const purchaseId = data.id;

        const itemsPayload = cart.map(item => ({
          purchase_id: purchaseId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }));

        const { error: itemsError } = await supabase.from("purchase_items").insert(itemsPayload);
        if (itemsError) throw itemsError;

        // Insert Serials
        const serialsPayload = cart.flatMap(item => 
          item.serials.map((sn: string) => ({
            purchase_id: purchaseId,
            product_id: item.product_id,
            serial_number: sn,
            status: 'in_stock'
          }))
        );
        if (serialsPayload.length > 0) {
          await supabase.from("product_serials").insert(serialsPayload);
        }

        // Auto-update stock and log inventory movement
        for (const item of cart) {
          const product = products?.find((p: any) => p.id === item.product_id);
          const currentStock = product?.stock_quantity ?? 0;
          await supabase.from("products").update({ stock_quantity: currentStock + item.quantity }).eq("id", item.product_id);
          
          await supabase.from("inventory_movements").insert({
            product_id: item.product_id,
            movement_type: "in",
            quantity: item.quantity,
            reference_type: "purchase",
            notes: `Supplier: ${supplierName}`,
            created_by: user?.id || null,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: editId ? "Purchase updated" : "Purchase recorded successfully" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePurchase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast({ title: "Purchase deleted" });
    },
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setSupplierName("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPaymentStatus("pending");
    setNotes("");
    setPaidAmount(0);
    setCart([]);
    setCurrentProductId("");
    setCurrentQty(1);
    setCurrentUnitCost(0);
  };

  const openEdit = async (p: any) => {
    setEditId(p.id);
    setSupplierName(p.supplier_name);
    setPurchaseDate(p.purchase_date);
    setPaymentStatus(p.payment_status);
    setNotes(p.notes || "");
    setPaidAmount(p.paid_amount || 0);
    
    // Fetch Serials for this purchase to populate the form
    const { data: serialsData } = await supabase.from("product_serials").select("*").eq("purchase_id", p.id);
    
    if (p.purchase_items) {
      setCart(p.purchase_items.map((item: any) => {
        const itemSerials = serialsData?.filter(s => s.product_id === item.products?.id).map(s => s.serial_number) || [];
        return {
          product_id: item.products?.id,
          product_name: item.products?.name,
          has_serial: item.products?.has_serial,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          serials: itemSerials
        };
      }));
    } else {
      setCart([]);
    }
    
    setOpen(true);
  };

  const handleBarcodeDetected = (sku: string) => {
    const product = products?.find((p: any) => p.sku === sku);
    if (product) {
      setCurrentProductId(product.id);
      setCurrentUnitCost(Number(product.price));
      toast({ title: "Product found", description: product.name });
    } else {
      toast({ title: "Not found", description: `No product with SKU: ${sku}`, variant: "destructive" });
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products?.find((p: any) => p.id === productId);
    setCurrentProductId(productId);
    setCurrentUnitCost(product?.price ? Number(product.price) : 0);
  };

  const totalPurchasesAmount = purchases?.reduce((sum: number, p: any) => sum + Number(p.total_cost), 0) || 0;
  const totalPaidAmount = purchases?.reduce((sum: number, p: any) => sum + Number(p.paid_amount || 0), 0) || 0;
  const totalDueAmount = totalPurchasesAmount - totalPaidAmount;

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    paid: "bg-success/10 text-success border-success/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
            <p className="text-muted-foreground text-sm">Track product procurement, serial numbers & AI bills</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Purchase</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Purchase" : "Record New Purchase"}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* AI Bill Upload */}
                {!editId && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm flex items-center">
                        <Scan className="h-4 w-4 mr-2 text-primary" />
                        AI Bill Scanner
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">Upload a bill photo to automatically extract products.</p>
                    </div>
                    <div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleBillUpload} />
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isParsingBill}>
                        {isParsingBill ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                        {isParsingBill ? "Parsing..." : "Upload Bill"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* General Info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label>Supplier Name *</Label>
                    <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Supplier name" required />
                  </div>
                  <div>
                    <Label>Purchase Date</Label>
                    <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Payment Status</Label>
                    <Select value={paymentStatus} onValueChange={v => setPaymentStatus(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Cart Section */}
                <Card className="border-border/50">
                  <CardHeader className="py-3 px-4 bg-muted/30">
                    <CardTitle className="text-sm flex items-center">
                      <ShoppingCart className="h-4 w-4 mr-2 text-primary" />
                      Add Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <BarcodeScanner onBarcodeDetected={handleBarcodeDetected} />
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 sm:col-span-5">
                        <Label className="text-xs">Product</Label>
                        <Select value={currentProductId} onValueChange={handleProductChange}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select product" /></SelectTrigger>
                          <SelectContent>
                            {products?.map((p: any) => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.name} {p.sku ? `(${p.sku})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" className="h-9 text-xs" min={1} value={currentQty} onChange={e => setCurrentQty(+e.target.value)} />
                      </div>
                      <div className="col-span-4 sm:col-span-3">
                        <Label className="text-xs">Cost (৳)</Label>
                        <Input type="number" className="h-9 text-xs" min={0} value={currentUnitCost} onChange={e => setCurrentUnitCost(+e.target.value)} />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Button type="button" onClick={addToCart} disabled={!currentProductId || currentQty < 1} className="w-full h-9 text-xs" variant="secondary">
                          Add
                        </Button>
                      </div>
                    </div>

                    {cart.length > 0 && (
                      <div className="mt-4 border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="py-2 text-xs">Item</TableHead>
                              <TableHead className="py-2 text-xs">Qty</TableHead>
                              <TableHead className="py-2 text-xs">Price</TableHead>
                              <TableHead className="py-2 text-xs">Total</TableHead>
                              <TableHead className="py-2 w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cart.map((item, idx) => (
                              <React.Fragment key={idx}>
                                <TableRow className={!item.product_id ? "bg-destructive/5" : ""}>
                                  <TableCell className="py-2 text-xs">
                                    <div className="font-medium text-foreground">{item.product_name}</div>
                                    {!item.product_id && (
                                      <div className="text-[10px] text-destructive flex items-center mt-1">
                                        <LinkIcon className="h-3 w-3 mr-1" /> Unlinked product!
                                      </div>
                                    )}
                                    {!item.product_id && (
                                      <div className="flex flex-col gap-1 mt-1">
                                        <Select value="" onValueChange={(val) => {
                                          const p = products?.find((pr: any) => pr.id === val);
                                          const newCart = [...cart];
                                          newCart[idx].product_id = p.id;
                                          newCart[idx].product_name = p.name;
                                          newCart[idx].has_serial = p.has_serial;
                                          setCart(newCart);
                                        }}>
                                          <SelectTrigger className="h-6 text-[10px]"><SelectValue placeholder="Link to existing product" /></SelectTrigger>
                                          <SelectContent>
                                            {products?.map((p: any) => (
                                              <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="h-6 text-[10px] w-full border-dashed"
                                          onClick={() => handleCreateNewProduct(idx, item.product_name, item.unit_price)}
                                        >
                                          <Plus className="h-3 w-3 mr-1" /> Add as New Product
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-2 text-xs">{item.quantity}</TableCell>
                                  <TableCell className="py-2 text-xs">৳{item.unit_price}</TableCell>
                                  <TableCell className="py-2 text-xs font-medium">৳{item.total_price}</TableCell>
                                  <TableCell className="py-2">
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(idx)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                {/* Serial Number Input Row */}
                                {item.has_serial && item.product_id && (
                                  <TableRow className="bg-muted/10">
                                    <TableCell colSpan={5} className="py-2 px-4">
                                      <Label className="text-[10px] text-primary flex items-center">
                                        <Scan className="h-3 w-3 mr-1" /> Serial Numbers (Comma separated) - Required {item.quantity}
                                      </Label>
                                      <Textarea 
                                        className="h-12 text-xs mt-1 bg-background" 
                                        placeholder="SN12345, SN67890..." 
                                        value={item.serials?.join(', ') || ""} 
                                        onChange={(e) => handleSerialsChange(idx, e.target.value)}
                                      />
                                      <div className="text-[10px] text-muted-foreground mt-1 text-right">
                                        Entered: {item.serials?.length || 0} / {item.quantity}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <div className="bg-muted/30 p-4 rounded-lg space-y-3 border border-border/50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-muted-foreground">Total Cost:</span>
                    <span className="font-bold text-lg">৳{cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-xs">Paid Amount (৳)</Label>
                      <Input type="number" min={0} max={cartTotal} value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))} className="bg-background border-success/30 focus-visible:ring-success/20" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Due Amount (৳)</Label>
                      <Input disabled value={dueAmount} className="bg-background font-bold text-destructive border-destructive/30" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                
                <Button className="w-full h-11" onClick={() => savePurchase.mutate()} disabled={savePurchase.isPending || !supplierName || cart.length === 0}>
                  {savePurchase.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {savePurchase.isPending ? "Saving..." : editId ? "Update Purchase" : "Save Purchase & Update Stock"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Purchases</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">৳{totalPurchasesAmount.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-success">৳{totalPaidAmount.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Due</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-destructive">৳{totalDueAmount.toLocaleString()}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Transactions</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{purchases?.length || 0}</p></CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : purchases?.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No purchases recorded yet</TableCell></TableRow>
                ) : purchases?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{format(new Date(p.purchase_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm font-medium">{p.supplier_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.purchase_items?.length || 0} items
                    </TableCell>
                    <TableCell className="text-sm font-bold">৳{Number(p.total_cost).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-success">৳{Number(p.paid_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-destructive">৳{(Number(p.total_cost) - Number(p.paid_amount || 0)).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor[p.payment_status] || ""}>{p.payment_status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            deletePurchase.mutate(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        title="স্থায়ীভাবে ডিলিট করুন"
      />
    </>
  );
}
