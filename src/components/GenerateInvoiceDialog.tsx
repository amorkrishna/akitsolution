import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useToast } from "@/hooks/use-toast";
import { FileText, Sparkles, User, Phone, Mail, Package } from "lucide-react";

interface GenerateInvoiceDialogProps {
  order: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateInvoiceDialog({ order, open, onOpenChange }: GenerateInvoiceDialogProps) {
  const { settings } = useCompanySettings();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [taxRate, setTaxRate] = useState<number>(0);
  const [taxLabel, setTaxLabel] = useState<string>("VAT");
  const [dueInDays, setDueInDays] = useState<number>(7);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTaxRate(Number(settings?.default_tax_rate ?? 0));
      setTaxLabel("VAT");
      setDueInDays(7);
      setPaidAmount(0);
    }
  }, [open, settings?.default_tax_rate]);

  const subtotal = order ? Number(order.item_price) * Number(order.quantity) : 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  const generate = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error("No order");

      // 1. Find or create client by phone (fallback by email)
      let clientId: string | null = null;
      if (order.customer_phone) {
        const { data: existing } = await supabase
          .from("clients")
          .select("id")
          .eq("phone", order.customer_phone)
          .maybeSingle();
        if (existing) clientId = existing.id;
      }
      if (!clientId && order.customer_email) {
        const { data: existing } = await supabase
          .from("clients")
          .select("id")
          .eq("email", order.customer_email)
          .maybeSingle();
        if (existing) clientId = existing.id;
      }
      if (!clientId) {
        const { data: newClient, error: cErr } = await supabase
          .from("clients")
          .insert({
            name: order.customer_name,
            phone: order.customer_phone || null,
            email: order.customer_email || null,
            notes: `Auto-created from store order on ${new Date().toLocaleDateString()}`,
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        clientId = newClient.id;
      }

      // 2. Generate invoice number via existing RPC
      const { data: invNumData, error: numErr } = await supabase.rpc("generate_invoice_number");
      if (numErr) throw numErr;
      const invoiceNumber = invNumData as unknown as string;

      // 3. Create invoice
      const issueDate = new Date().toISOString().split("T")[0];
      const due = new Date();
      due.setDate(due.getDate() + Number(dueInDays || 0));
      const dueDate = due.toISOString().split("T")[0];

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          client_id: clientId,
          issue_date: issueDate,
          due_date: dueDate,
          status: "sent",
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          paid_amount: paidAmount,
          notes: `Generated from store order #${order.id.slice(0, 8)}${taxRate > 0 ? ` · ${taxLabel} ${taxRate}%` : ""}`,
        })
        .select("id, invoice_number")
        .single();
      if (invErr) throw invErr;

      // 4. Insert line item
      const { error: itemErr } = await supabase.from("invoice_items").insert({
        invoice_id: invoice.id,
        description: order.item_name,
        quantity: Number(order.quantity),
        unit_price: Number(order.item_price),
        total: subtotal,
      });
      if (itemErr) throw itemErr;

      // 5. Link invoice to order
      await supabase
        .from("store_orders")
        .update({ invoice_id: invoice.id })
        .eq("id", order.id);

      return invoice;
    },
    onMutate: () => setBusy(true),
    onSettled: () => setBusy(false),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Invoice generated",
        description: `${invoice.invoice_number} created. Opening invoices…`,
      });
      onOpenChange(false);
      navigate("/invoices");
    },
    onError: (err: any) => {
      toast({
        title: "Failed to generate invoice",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate Invoice
          </DialogTitle>
          <DialogDescription>
            Create an invoice for this order. The customer will be auto-saved to your client list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer card */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {order.customer_name}
            </div>
            {order.customer_phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                {order.customer_phone}
              </div>
            )}
            {order.customer_email && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                {order.customer_email}
              </div>
            )}
          </div>

          {/* Item card */}
          <div className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <Package className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{order.item_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty: {order.quantity} × ৳{Number(order.item_price).toLocaleString()}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="flex-shrink-0">
                ৳{subtotal.toLocaleString()}
              </Badge>
            </div>
          </div>

          {/* Tax & due controls */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tax-label" className="text-xs">Tax label</Label>
              <Input
                id="tax-label"
                value={taxLabel}
                onChange={(e) => setTaxLabel(e.target.value)}
                placeholder="VAT / GST"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax-rate" className="text-xs">Tax rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due-days" className="text-xs">Due in (days)</Label>
              <Input
                id="due-days"
                type="number"
                min={0}
                value={dueInDays}
                onChange={(e) => setDueInDays(Number(e.target.value) || 0)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paid-amount" className="text-xs">Advance Paid (৳)</Label>
              <Input
                id="paid-amount"
                type="number"
                min={0}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                className="h-9"
              />
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-accent/5 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">৳{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{taxLabel || "Tax"} ({taxRate}%)</span>
              <span className="font-medium">৳{taxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t pt-1.5 mt-1.5 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold text-primary">৳{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-600">
                <span className="font-medium">Advance Paid</span>
                <span className="font-bold">- ৳{paidAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="border-t pt-1.5 mt-1.5 flex items-center justify-between">
              <span className="font-semibold text-destructive">Due Amount</span>
              <span className="text-lg font-bold text-destructive">৳{Math.max(0, total - paidAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            After generation you'll be redirected to the Invoices page to download the PDF.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => generate.mutate()} disabled={busy}>
            {busy ? "Generating…" : "Generate Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}