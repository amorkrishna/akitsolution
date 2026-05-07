import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Eye, Printer, Download, FileText, Send, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { QuotationPreview } from "@/components/QuotationPreview";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-destructive/10 text-destructive",
  expired: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export default function Quotations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [previewQuotation, setPreviewQuotation] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: quotations, isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select("*, clients(name, address)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async (q: any) => {
      // Fetch quotation items
      const { data: qItems } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id);
      // Generate invoice number
      const { data: invNum } = await supabase.rpc("generate_invoice_number");
      // Create invoice
      const { data: invoice, error: invError } = await supabase.from("invoices").insert({
        invoice_number: invNum,
        client_id: q.client_id,
        issue_date: new Date().toISOString().split("T")[0],
        subtotal: q.subtotal,
        tax_rate: q.tax_rate,
        tax_amount: q.tax_amount,
        total: q.total,
        status: "draft",
        notes: q.notes ? `Converted from ${q.quotation_number}. ${q.notes}` : `Converted from ${q.quotation_number}`,
      }).select().single();
      if (invError) throw invError;
      // Copy items
      if (qItems?.length) {
        const invoiceItems = qItems.map((item: any) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        }));
        const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems);
        if (itemsError) throw itemsError;
      }
      // Update quotation status to accepted
      await supabase.from("quotations").update({ status: "accepted" }).eq("id", q.id);
      return invoice;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast({ title: "Invoice created!", description: `Invoice ${invoice.invoice_number} created from quotation.` });
      navigate("/invoices");
    },
    onError: (err: any) => {
      toast({ title: "Conversion failed", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("quotations").update({ status }).eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast({ title: `Quotation marked as ${status}` });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast({ title: "Quotation deleted" });
    },
  });

  const viewQuotation = async (q: any) => {
    const { data: items } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id);
    setPreviewQuotation({ ...q, items: items || [] });
  };

  const generatePdf = async (sourceEl: HTMLElement, fileName: string) => {
    const cloneHost = document.createElement("div");
    cloneHost.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;min-width:794px;max-width:794px;opacity:1;pointer-events:none;z-index:2147483647;overflow:visible;";
    const clone = sourceEl.cloneNode(true) as HTMLElement;
    clone.style.width = "794px";
    clone.style.minWidth = "794px";
    clone.style.maxWidth = "794px";
    cloneHost.appendChild(clone);
    document.body.appendChild(cloneHost);

    try {
      if (document.fonts) try { await document.fonts.ready; } catch {}

      // Text rendering fixes
      (Array.from(clone.querySelectorAll("*")) as HTMLElement[]).forEach(el => {
        el.style.wordSpacing = "0px";
        el.style.letterSpacing = "normal";
        el.style.fontKerning = "none";
        el.style.textRendering = "geometricPrecision";
      });

      // Quotation label fix
      const labelWrap = clone.querySelector("[data-pdf-quotation-label]") as HTMLElement | null;
      if (labelWrap) {
        labelWrap.style.cssText = "overflow:visible;min-width:150px;height:42px;background-color:#0d9488;display:inline-flex;align-items:center;justify-content:center;padding:10px 16px;border-radius:8px;border:2px solid #0d9488;white-space:nowrap;box-sizing:border-box;";
        labelWrap.innerHTML = "";
        const span = document.createElement("span");
        span.textContent = "QUOTATION";
        span.style.cssText = "font-size:16px;line-height:1;font-weight:900;color:#ffffff;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.06em;-webkit-text-fill-color:#ffffff;display:inline-block;";
        labelWrap.appendChild(span);
      }

      // Image preloading
      await Promise.all((Array.from(clone.querySelectorAll("img")) as HTMLImageElement[]).map(async img => {
        if (!img.complete) await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); });
        const src = img.currentSrc || img.src;
        if (!src || src.startsWith("data:")) return;
        try {
          const res = await fetch(src, { mode: "cors" });
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject();
            reader.readAsDataURL(blob);
          });
          img.src = dataUrl;
          if (!img.complete) await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); });
        } catch {}
      }));

      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      await new Promise(r => setTimeout(r, 600));

      const cloneRect = clone.getBoundingClientRect();
      const captureWidth = 794;
      const captureHeight = Math.max(Math.ceil(cloneRect.height), clone.scrollHeight, 1123);
      const renderScale = 3;

      const canvas = await html2canvas(clone, {
        scale: renderScale, useCORS: true, allowTaint: true, backgroundColor: "#ffffff",
        imageTimeout: 15000, logging: false,
        width: captureWidth, height: captureHeight, windowWidth: captureWidth, windowHeight: captureHeight,
        scrollX: 0, scrollY: 0,
      });

      // Paint QUOTATION label directly on canvas
      let labelBounds: { x: number; y: number; w: number; h: number } | null = null;
      if (labelWrap) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const labelRect = labelWrap.getBoundingClientRect();
          const rootRect = clone.getBoundingClientRect();
          const scaleX = canvas.width / captureWidth;
          const scaleY = canvas.height / captureHeight;
          const x = (labelRect.left - rootRect.left) * scaleX;
          const y = (labelRect.top - rootRect.top) * scaleY;
          const w = labelRect.width * scaleX;
          const h = labelRect.height * scaleY;
          labelBounds = { x, y, w, h };
          const r = Math.min(16 * scaleY, h / 2);
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.fillStyle = "#0d9488";
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = `900 ${Math.max(16 * scaleY, 32)}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("QUOTATION", x + w / 2, y + h / 2);
          ctx.restore();
        }
      }

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);

      if (labelBounds) {
        const xMm = (labelBounds.x / canvas.width) * pdfW;
        const yMm = (labelBounds.y / canvas.height) * pdfH;
        const wMm = (labelBounds.w / canvas.width) * pdfW;
        const hMm = (labelBounds.h / canvas.height) * pdfH;
        pdf.setFillColor(13, 148, 136);
        pdf.roundedRect(xMm, yMm, wMm, hMm, 2, 2, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(Math.max(12, Math.min(16, hMm * 1.6)));
        pdf.text("QUOTATION", xMm + wMm / 2, yMm + hMm * 0.64, { align: "center" });
      }

      const pdfBlob = pdf.output("blob");
      const isMobileUa = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const shareNav = navigator as any;

      if (isMobileUa && shareNav.share) {
        const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });
        try { await shareNav.share({ files: [pdfFile], title: fileName }); return; } catch {}
      }

      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { link.parentNode?.removeChild(link); URL.revokeObjectURL(blobUrl); }, 30000);
    } finally {
      document.body.removeChild(cloneHost);
    }
  };

  const downloadQuotationPdf = async (q: any) => {
    setDownloadingId(q.id);
    try {
      const { data: items } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id);
      const fullQ = { ...q, items: items || [] };
      setPreviewQuotation(fullQ);
      await new Promise(r => setTimeout(r, 800));
      const el = document.getElementById("quotation-print");
      if (!el) { toast({ title: "Error generating PDF", variant: "destructive" }); return; }
      const clientName = q.clients?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Client";
      await generatePdf(el, `Quotation_${q.quotation_number}_${clientName}.pdf`);
      toast({ title: "PDF downloaded!" });
    } catch (err: any) {
      toast({ title: "PDF Error", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrint = () => {
    const printEl = document.getElementById("quotation-print");
    if (!printEl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Quotation</title><style>@media print{body{margin:0;padding:0;}}</style></head><body>${printEl.outerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
      <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
            <p className="text-muted-foreground text-sm">Create and manage quotations for CCTV, attendance devices & IT products</p>
          </div>
          <Button onClick={() => navigate("/quotations/create")}>
            <Plus className="h-4 w-4 mr-2" />New Quotation
          </Button>
        </div>

        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead className="text-right">Total (৳)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : !quotations?.length ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No quotations yet. Create your first one!</TableCell></TableRow>
                ) : (
                  quotations.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">{q.quotation_number}</TableCell>
                      <TableCell>{q.clients?.name || "—"}</TableCell>
                      <TableCell>{format(new Date(q.issue_date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{q.valid_until ? format(new Date(q.valid_until), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-right font-medium">৳{Number(q.total).toLocaleString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                              <Badge className={`${statusColors[q.status] || ""} cursor-pointer`} variant="outline">{q.status}</Badge>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: q.id, status: "draft" })} disabled={q.status === "draft"}>
                              <Clock className="h-3.5 w-3.5 mr-2 text-muted-foreground" />Draft
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: q.id, status: "sent" })} disabled={q.status === "sent"}>
                              <Send className="h-3.5 w-3.5 mr-2 text-blue-600" />Sent
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: q.id, status: "accepted" })} disabled={q.status === "accepted"}>
                              <CheckCircle className="h-3.5 w-3.5 mr-2 text-green-600" />Accepted
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: q.id, status: "rejected" })} disabled={q.status === "rejected"}>
                              <XCircle className="h-3.5 w-3.5 mr-2 text-destructive" />Rejected
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: q.id, status: "expired" })} disabled={q.status === "expired"}>
                              <Clock className="h-3.5 w-3.5 mr-2 text-yellow-600" />Expired
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewQuotation(q)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadQuotationPdf(q)} disabled={downloadingId === q.id} title="Download PDF">
                            <Download className={`h-4 w-4 ${downloadingId === q.id ? "animate-spin" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => convertToInvoiceMutation.mutate(q)} disabled={convertToInvoiceMutation.isPending} title="Convert to Invoice">
                            <FileText className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(q.id)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewQuotation} onOpenChange={(open) => !open && setPreviewQuotation(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-0 flex flex-row items-center justify-between">
            <DialogTitle>Quotation Preview</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />Print
              </Button>
              <Button size="sm" onClick={() => previewQuotation && downloadQuotationPdf(previewQuotation)} disabled={downloading}>
                <Download className="h-4 w-4 mr-1" />{downloading ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </DialogHeader>
          <div className="p-4 overflow-x-auto">
            {previewQuotation && <QuotationPreview quotation={previewQuotation} />}
          </div>
        </DialogContent>
      </Dialog>
      </>
);
}
