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
import autoTable from "jspdf-autotable";
import { useCompanySettings } from "@/hooks/useCompanySettings";
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
  const { settings } = useCompanySettings();
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

  
  const generateVectorPdf = async (
    quotation: any,
    settings: any,
    fileName: string,
    options: { skipDownload?: boolean } = {}
  ): Promise<Blob | null> => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFillColor(13, 148, 136); // #0d9488
    doc.roundedRect(pageWidth - 50, 15, 35, 12, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("QUOTATION", pageWidth - 32.5, 23, { align: "center" });

    doc.setTextColor(17, 24, 39);
    doc.setFontSize(22);
    doc.text(settings.company_name || "AK IT Solution", 15, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    if (settings.company_tagline) {
      doc.text(settings.company_tagline, 15, y);
      y += 5;
    }

    doc.setFontSize(9);
    if (settings.address) { doc.text(`Address: ${settings.address}`, 15, y); y += 4; }
    if (settings.phone) { doc.text(`Phone: ${settings.phone}`, 15, y); y += 4; }
    if (settings.email) { doc.text(`Email: ${settings.email}`, 15, y); y += 4; }

    // Quotation details
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(quotation.quotation_number, pageWidth - 15, 33, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Date: ${new Date(quotation.issue_date).toLocaleDateString("en-GB")}`, pageWidth - 15, 39, { align: "right" });
    if (quotation.valid_until) {
      doc.text(`Valid Until: ${new Date(quotation.valid_until).toLocaleDateString("en-GB")}`, pageWidth - 15, 44, { align: "right" });
    }

    y = Math.max(y + 10, 55);
    doc.setDrawColor(209, 213, 219);
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    // Prepared For
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text("PREPARED FOR", 15, y);
    y += 5;

    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    const clientName = (quotation as any).clients?.name || "Client";
    doc.text(clientName, 15, y);
    y += 5;

    if ((quotation as any).clients?.address) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      const splitAddress = doc.splitTextToSize((quotation as any).clients.address, 80);
      doc.text(splitAddress, 15, y);
      y += splitAddress.length * 5;
    }
    y += 5;

    // Table
    const tableData = (quotation.items || []).map((item: any, idx: number) => {
      const isService = item.description?.startsWith("[Service]");
      const isProduct = item.description?.startsWith("[Product]");
      const cleanDesc = item.description?.replace(/^\[(Service|Product)\]\s*/, "").replace(/\s*\(Warranty:.*?\)$/, "").replace(/\s*\(SN:.*?\)/, "") || item.description;
      const warranty = item.description?.match(/\(Warranty:\s*(.*?)\)/)?.[1] || "—";
      const itemType = isService ? "Service" : isProduct ? "Product" : "Custom";
      return [
        (idx + 1).toString(),
        cleanDesc,
        itemType,
        warranty,
        item.quantity.toString(),
        `Tk ${Number(item.unit_price).toLocaleString()}`,
        `Tk ${Number(item.total).toLocaleString()}`
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["#", "Description", "Type", "Warranty", "Qty", "Price", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 9, textColor: 55 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    const rightMargin = pageWidth - 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    
    doc.text("Subtotal:", rightMargin - 40, y);
    doc.setTextColor(55, 65, 81);
    doc.text(`Tk ${Number(quotation.subtotal).toLocaleString()}`, rightMargin, y, { align: "right" });
    y += 6;
    
    doc.setTextColor(107, 114, 128);
    doc.text(`Tax (${quotation.tax_rate}%):`, rightMargin - 40, y);
    doc.setTextColor(55, 65, 81);
    doc.text(`Tk ${Number(quotation.tax_amount).toLocaleString()}`, rightMargin, y, { align: "right" });
    y += 6;
    
    doc.setDrawColor(13, 148, 136);
    doc.line(rightMargin - 60, y, rightMargin, y);
    y += 8;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text("Total:", rightMargin - 40, y);
    doc.setTextColor(13, 148, 136);
    doc.text(`Tk ${Number(quotation.total).toLocaleString()}`, rightMargin, y, { align: "right" });

    let leftY = (doc as any).lastAutoTable.finalY + 10;
    
    if (quotation.notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(245, 158, 11);
      doc.text("NOTES / TERMS", 15, leftY);
      leftY += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      const splitNotes = doc.splitTextToSize(quotation.notes, 100);
      doc.text(splitNotes, 15, leftY);
      leftY += splitNotes.length * 4;
    }

    const pageHeight = doc.internal.pageSize.getHeight();
    let sigY = Math.max(y, leftY) + 30;
    if (sigY > pageHeight - 30) { doc.addPage(); sigY = 30; }

    doc.setDrawColor(156, 163, 175);
    doc.line(30, sigY, 80, sigY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text("Client Signature", 55, sigY + 5, { align: "center" });

    doc.line(pageWidth - 80, sigY, pageWidth - 30, sigY);
    doc.text("Authorized Signature", pageWidth - 55, sigY + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(settings.company_name || "", pageWidth - 55, sigY + 9, { align: "center" });

    doc.text(`${settings.footer_text || ""} | ${settings.company_name || ""} | ${settings.phone || ""}`, pageWidth / 2, pageHeight - 10, { align: "center" });

    const pdfBlob = doc.output("blob");
    if (options.skipDownload) return pdfBlob;

    const shareNavigator = navigator as any;
    const isMobileUa = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileUa && shareNavigator.share) {
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });
      try { await shareNavigator.share({ files: [pdfFile], title: fileName }); return null; } catch {}
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
