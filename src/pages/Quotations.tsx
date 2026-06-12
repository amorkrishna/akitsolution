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
import { Plus, Trash2, Eye, Printer, Download, FileText, Send, CheckCircle, XCircle, Clock, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { QuotationPreview } from "@/components/QuotationPreview";
import autoTable from "jspdf-autotable";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import jsPDF from "jspdf";
import { openWhatsApp } from "@/lib/whatsapp";

// Inline WhatsApp glyph (lucide doesn't ship one)
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.05 4.91A10 10 0 0 0 4.1 18.32L3 22l3.78-1.08a10 10 0 0 0 4.78 1.22h.01A10 10 0 0 0 19.05 4.91Zm-7.49 15.4h-.01a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-2.24.64.6-2.18-.2-.31a8.3 8.3 0 1 1 6.38 3.19Zm4.55-6.22c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.16.25-.64.81-.78.97-.14.17-.29.18-.53.06-.25-.13-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.39-1.73c-.14-.25 0-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09 0 1.23.9 2.42 1.03 2.59.13.17 1.78 2.71 4.31 3.8.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.29Z"/>
  </svg>
);

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
  const { settings } = useCompanySettings();
  const [previewQuotation, setPreviewQuotation] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [whatsappId, setWhatsappId] = useState<string | null>(null);

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

  
  const generateVectorPdf = async (
    quotation: any,
    settings: any,
    fileName: string,
    options: { skipDownload?: boolean } = {}
  ): Promise<Blob | null> => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = document.getElementById("quotation-print");
      if (!el) throw new Error("Quotation element not found");

      // Temporarily ensure it is visible and not affected by wrapper opacity
      const wrapper = el.parentElement;
      const originalOpacity = wrapper?.style.opacity;
      if (wrapper) wrapper.style.opacity = "1";

      // Small delay to ensure images/fonts are rendered
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(el, {
        scale: 4, // Increased scale for high-quality, crisp text
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      if (wrapper && originalOpacity !== undefined) {
        wrapper.style.opacity = originalOpacity;
      }

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output("blob");
      if (options.skipDownload) return pdfBlob;

      const shareNavigator = navigator as any;
      const isMobileUa = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobileUa && shareNavigator.share) {
        const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });
        try { await shareNavigator.share({ files: [pdfFile], title: fileName }); return null; } catch {/* no-op */}
      }

      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { if(link.parentNode) link.parentNode.removeChild(link); URL.revokeObjectURL(blobUrl); }, 30000);
      
      return pdfBlob;
    } catch (error) {
      console.error("PDF generation failed:", error);
      return null;
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
      await generateVectorPdf(fullQ, settings, `Quotation_${q.quotation_number}_${clientName}.pdf`);
      toast({ title: "PDF downloaded!" });
    } catch (err: any) {
      toast({ title: "PDF Error", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const sendQuotationWhatsApp = async (q: any) => {
    const clientPhone = q.clients?.phone as string | undefined;
    const phone = clientPhone || settings.whatsapp_number || settings.phone?.split(",")[0]?.trim() || "";
    if (!phone) {
      toast({ title: "No WhatsApp number found", description: "Add a phone to the client or company settings.", variant: "destructive" });
      return;
    }

    setWhatsappId(q.id);
    try {
      const { data: items } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id);
      const fullQ = { ...q, items: items || [] };
      let clientRow = q.clients;
      if (!clientRow?.phone && q.client_id) {
        const { data: c } = await supabase.from("clients").select("name, address, phone").eq("id", q.client_id).maybeSingle();
        if (c) clientRow = c;
      }
      fullQ.clients = clientRow;

      setPreviewQuotation(fullQ);
      await new Promise((r) => setTimeout(r, 800));
      const el = document.getElementById("quotation-print");
      if (!el) { toast({ title: "Error generating PDF", variant: "destructive" }); return; }

      const clientName = clientRow?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Client";
      const fileName = `Quotation_${fullQ.quotation_number}_${clientName}.pdf`;
      const blob = await generateVectorPdf(fullQ, settings, fileName, { skipDownload: true });
      if (!blob) throw new Error("PDF generation failed");

      // Upload to public storage bucket
      const path = `${fullQ.quotation_number}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from("invoices").upload(path, blob, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (upErr) throw upErr;

      const { data: publicData } = supabase.storage.from("invoices").getPublicUrl(path);
      const pdfUrl = publicData.publicUrl;

      const targetPhone = clientRow?.phone || phone;
      const cName = clientRow?.name || "Customer";
      const message =
        `আসসালামু আলাইকুম ${cName},\n\n` +
        `${settings.company_name} থেকে আপনার কোটেশন পাঠানো হলো ✅\n\n` +
        `📝 Quotation: ${fullQ.quotation_number}\n` +
        `📅 Date: ${new Date(fullQ.issue_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}\n` +
        `💰 Total: ৳${Number(fullQ.total).toLocaleString()}\n\n` +
        `📎 PDF Download:\n${pdfUrl}\n\n` +
        `কোনো প্রশ্ন থাকলে জানাবেন।\n\nধন্যবাদ\n${settings.company_name}`;

      openWhatsApp(targetPhone, message);
      toast({ title: "WhatsApp opened", description: "Quotation link copied into the chat." });
    } catch (e: any) {
      toast({ title: "Error sending quotation", description: e?.message, variant: "destructive" });
    } finally {
      setWhatsappId(null);
      setPreviewQuotation(null);
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
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/quotations/edit/${q.id}`)} title="Edit Quotation">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewQuotation(q)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadQuotationPdf(q)} disabled={downloadingId === q.id} title="Download PDF">
                            <Download className={`h-4 w-4 ${downloadingId === q.id ? "animate-spin" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Send via WhatsApp" disabled={whatsappId === q.id} onClick={() => sendQuotationWhatsApp(q)}>
                            <WhatsAppIcon className="h-4 w-4 text-green-600" />
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
              <Button size="sm" variant="outline" className="text-green-600 border-green-600/40 hover:bg-green-600/10" onClick={() => { setPreviewQuotation(null); sendQuotationWhatsApp(previewQuotation); }}>
                <WhatsAppIcon className="h-4 w-4 mr-2" />WhatsApp
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
