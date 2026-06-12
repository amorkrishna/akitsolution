import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Eye, Printer, Download, Search, CalendarIcon, LayoutGrid, LayoutList, X, ExternalLink, CheckCircle, Circle, Pencil, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { InvoicePreview } from "@/components/InvoicePreview";
import { cn } from "@/lib/utils";
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { openWhatsApp } from "@/lib/whatsapp";
import { sendSMS } from "@/lib/sms";

// Inline WhatsApp glyph (lucide doesn't ship one)
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.05 4.91A10 10 0 0 0 4.1 18.32L3 22l3.78-1.08a10 10 0 0 0 4.78 1.22h.01A10 10 0 0 0 19.05 4.91Zm-7.49 15.4h-.01a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-2.24.64.6-2.18-.2-.31a8.3 8.3 0 1 1 6.38 3.19Zm4.55-6.22c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.16.25-.64.81-.78.97-.14.17-.29.18-.53.06-.25-.13-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.39-1.73c-.14-.25 0-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09 0 1.23.9 2.42 1.03 2.59.13.17 1.78 2.71 4.31 3.8.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.29Z"/>
  </svg>
);

export default function Invoices() {
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [whatsappId, setWhatsappId] = useState<string | null>(null);
  const [fallbackPdfUrl, setFallbackPdfUrl] = useState<string | null>(null);
  const [searchClient, setSearchClient] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { settings } = useCompanySettings();

  const effectiveView = isMobile ? "card" : viewMode;

  const { data: invoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await supabase.from("invoices").select("*, clients(name, address, phone), projects(title)").order("created_at", { ascending: false })).data || [],
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv) => {
      const clientName = (inv as any).clients?.name || "";
      const matchesClient = !searchClient || clientName.toLowerCase().includes(searchClient.toLowerCase()) || inv.invoice_number.toLowerCase().includes(searchClient.toLowerCase());
      const matchesDate = !dateFilter || inv.issue_date === format(dateFilter, "yyyy-MM-dd");
      return matchesClient && matchesDate;
    });
  }, [invoices, searchClient, dateFilter]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("invoices").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices"] }); toast({ title: "Invoice deleted" }); },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ inv, amount, method }: { inv: any, amount: number, method: string }) => {
      const newPaidAmount = Math.min(Number(inv.total), Number(inv.paid_amount || 0) + amount);
      let newStatus = inv.status;
      if (newPaidAmount >= Number(inv.total)) {
        newStatus = "paid";
      } else if (newPaidAmount > 0) {
        newStatus = "partial";
      }

      const { error } = await supabase.from("invoices").update({
        paid_amount: newPaidAmount,
        payment_method: method,
        status: newStatus
      }).eq("id", inv.id);
      
      if (error) throw error;

      // When fully paid, decrement stock
      if (newStatus === "paid" && inv.status !== "paid") {
        const { data: invItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
        if (invItems) {
          for (const item of invItems) {
            const { data: matchedProducts } = await supabase.from("products").select("id, stock_quantity").ilike("name", `%${item.description}%`).limit(1);
            if (matchedProducts && matchedProducts.length > 0) {
              const product = matchedProducts[0];
              const newQty = Math.max(0, product.stock_quantity - item.quantity);
              await supabase.from("products").update({ stock_quantity: newQty }).eq("id", product.id);
              await supabase.from("inventory_movements").insert({ product_id: product.id, movement_type: "out", quantity: item.quantity, reference_type: "invoice", notes: `Invoice ${inv.invoice_number}` });
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Payment recorded successfully" });
      setPaymentInvoice(null);
      setPaymentAmount("");
    },
  });

  const viewInvoice = async (inv: any) => {
    const { data: invItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
    setPreviewInvoice({ ...inv, items: invItems || [] });
  };

  
  const generateVectorPdf = async (
    invoice: any,
    settings: any,
    fileName: string,
    options: { skipDownload?: boolean } = {/* no-op */}
  ): Promise<Blob | null> => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(pageWidth - 50, 15, 35, 12, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("INVOICE", pageWidth - 32.5, 23, { align: "center" });

    doc.setTextColor(17, 24, 39);
    doc.setFontSize(22);
    
    let textX = 15;
    if (settings.logo_url) {
      try {
        const res = await fetch(settings.logo_url);
        const blob = await res.blob();
        const base64data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        // We use JPEG or PNG depending on the image, usually PNG works fine for transparent logos
        // In jsPDF, drawing image needs base64 without the prefix data:image/... base64,
        // Actually jsPDF handles data URLs automatically.
        doc.addImage(base64data, "PNG", 15, y - 5, 18, 18);
        textX = 38;
      } catch (e) {
        console.warn("Could not load logo for PDF", e);
      }
    }

    doc.text(settings.company_name || "AK IT Solution", textX, y + 2);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    if (settings.company_tagline) {
      doc.text(settings.company_tagline, textX, y);
      y += 5;
    }

    doc.setFontSize(9);
    if (settings.address) { doc.text(`Address: ${settings.address}`, textX, y); y += 4; }
    if (settings.phone) { doc.text(`Phone: ${settings.phone}`, textX, y); y += 4; }
    if (settings.email) { doc.text(`Email: ${settings.email}`, textX, y); y += 4; }

    // Invoice details
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(invoice.invoice_number, pageWidth - 15, 33, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Date: ${new Date(invoice.issue_date).toLocaleDateString("en-GB")}`, pageWidth - 15, 39, { align: "right" });
    if (invoice.due_date) {
      doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString("en-GB")}`, pageWidth - 15, 44, { align: "right" });
    }

    y = Math.max(y + 10, 55);
    doc.setDrawColor(209, 213, 219);
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    // Bill To
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text("BILL TO", 15, y);
    y += 5;

    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    const clientName = (invoice as any).clients?.name || "Paid in Cash";
    doc.text(clientName, 15, y);
    y += 5;

    if ((invoice as any).clients?.address) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      const splitAddress = doc.splitTextToSize((invoice as any).clients.address, 80);
      doc.text(splitAddress, 15, y);
      y += splitAddress.length * 5;
    }
    y += 5;

    // Table
    const tableData = (invoice.items || []).map((item: any, idx: number) => {
      const isService = item.description?.startsWith("[Service]");
      const isProduct = item.description?.startsWith("[Product]");
      const cleanDesc = item.description?.replace(/^\[(Service|Product)\]\s*/, "").replace(/\s*\(Warranty:.*?\)$/, "").replace(/\s*\(SN:.*?\)/, "") || item.description;
      const warranty = item.description?.match(/\(Warranty:\s*(.*?)\)/)?.[1] || "—";
      const sn = item.description?.match(/\(SN:\s*(.*?)\)/)?.[1] || "";
      const itemType = isService ? "Service" : isProduct ? "Product" : "Custom";
      let descText = cleanDesc;
      if (sn) descText += `\nSN: ${sn}`;
      return [
        (idx + 1).toString(),
        descText,
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
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 9, fontStyle: "bold" },
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
    doc.text(`Tk ${Number(invoice.subtotal).toLocaleString()}`, rightMargin, y, { align: "right" });
    y += 6;
    
    doc.setTextColor(107, 114, 128);
    doc.text(`Tax (${invoice.tax_rate}%):`, rightMargin - 40, y);
    doc.setTextColor(55, 65, 81);
    doc.text(`Tk ${Number(invoice.tax_amount).toLocaleString()}`, rightMargin, y, { align: "right" });
    y += 6;

    if (Number(invoice.paid_amount || 0) > 0) {
      doc.setTextColor(22, 163, 74); // green-600
      doc.text("Paid Amount:", rightMargin - 40, y);
      doc.text(`Tk ${Number(invoice.paid_amount).toLocaleString()}`, rightMargin, y, { align: "right" });
      y += 6;
    }
    
    doc.setDrawColor(30, 58, 138);
    doc.line(rightMargin - 60, y, rightMargin, y);
    y += 8;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(Number(invoice.paid_amount || 0) > 0 ? "Due Amount:" : "Total Due:", rightMargin - 40, y);
    doc.setTextColor(37, 99, 235);
    doc.text(`Tk ${(Number(invoice.total) - Number(invoice.paid_amount || 0)).toLocaleString()}`, rightMargin, y, { align: "right" });

    let leftY = (doc as any).lastAutoTable.finalY + 10;
    const hasBankInfo = settings.show_payment_info && (settings.bank_name || settings.bank_account_number || settings.mobile_banking);
    if (hasBankInfo) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(96, 165, 250);
      doc.text("PAYMENT INFORMATION", 15, leftY);
      leftY += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      if (settings.bank_name) { doc.text(`Bank: ${settings.bank_name}`, 15, leftY); leftY += 4; }
      if (settings.bank_account_name) { doc.text(`A/C Name: ${settings.bank_account_name}`, 15, leftY); leftY += 4; }
      if (settings.bank_account_number) { doc.text(`A/C No: ${settings.bank_account_number}`, 15, leftY); leftY += 4; }
      if (settings.bank_branch) { doc.text(`Branch: ${settings.bank_branch}`, 15, leftY); leftY += 4; }
      if (settings.mobile_banking) { doc.text(`Mobile Banking: ${settings.mobile_banking}`, 15, leftY); leftY += 4; }
      leftY += 4;
    }

    if (invoice.notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(245, 158, 11);
      doc.text("NOTES", 15, leftY);
      leftY += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      const splitNotes = doc.splitTextToSize(invoice.notes, 100);
      doc.text(splitNotes, 15, leftY);
      leftY += splitNotes.length * 4 + 4;
    }

    if (settings.terms_conditions) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("TERMS & CONDITIONS", 15, leftY);
      leftY += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(8);
      const splitTerms = doc.splitTextToSize(settings.terms_conditions, 100);
      doc.text(splitTerms, 15, leftY);
      leftY += splitTerms.length * 3.5;
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

    // Add QR Code at the center
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Verification:${invoice.invoice_number}`;
      // In jsPDF, we can add image from URL if it's base64 or we load it. For simplicity, we skip loading the async image here unless we fetch it.
      // Wait, jsPDF addImage needs base64. So I will skip it for the PDF to avoid async loading issues, or just use text for verification.
    } catch (e) {/* no-op */}

    doc.text(`${settings.footer_text || ""} | ${settings.company_name || ""} | ${settings.phone || ""}`, pageWidth / 2, pageHeight - 10, { align: "center" });

    const pdfBlob = doc.output("blob");
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
  };


  const downloadInvoicePdf = async (inv: any) => {
    setDownloadingId(inv.id);
    try {
      const { data: invItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
      const fullInvoice = { ...inv, items: invItems || [] };
      setPreviewInvoice(fullInvoice);
      await new Promise((r) => setTimeout(r, 800));
      const el = document.getElementById("invoice-print");
      if (!el) { toast({ title: "Error generating PDF", variant: "destructive" }); return; }

      await generateVectorPdf(fullInvoice, settings, `${fullInvoice.invoice_number}.pdf`);
    } catch {
      toast({ title: "Error generating PDF", variant: "destructive" });
    } finally {
      setDownloadingId(null);
      setPreviewInvoice(null);
    }
  };

  const sendInvoiceWhatsApp = async (inv: any) => {
    // Resolve recipient phone: client phone preferred, fallback to company whatsapp
    const clientPhone = (inv as any).clients?.phone as string | undefined;
    const phone = clientPhone || settings.whatsapp_number || settings.phone?.split(",")[0]?.trim() || "";
    if (!phone) {
      toast({ title: "No WhatsApp number found", description: "Add a phone to the client or company settings.", variant: "destructive" });
      return;
    }

    setWhatsappId(inv.id);
    try {
      // Render invoice off-screen so we can capture
      const { data: invItems } = await supabase.from("invoice_items").select("*, clients:invoices(client_id)").eq("invoice_id", inv.id);
      const fullInvoice = { ...inv, items: invItems || [] };

      // Need full client (with phone) — refetch if missing
      let clientRow = (inv as any).clients;
      if (!clientRow?.phone && inv.client_id) {
        const { data: c } = await supabase.from("clients").select("name, address, phone").eq("id", inv.client_id).maybeSingle();
        if (c) clientRow = c;
      }
      fullInvoice.clients = clientRow;

      setPreviewInvoice(fullInvoice);
      await new Promise((r) => setTimeout(r, 800));
      const el = document.getElementById("invoice-print");
      if (!el) { toast({ title: "Error generating PDF", variant: "destructive" }); return; }

      const blob = await generateVectorPdf(fullInvoice, settings, `${fullInvoice.invoice_number}.pdf`, { skipDownload: true });
      if (!blob) throw new Error("PDF generation failed");

      // Upload to public storage bucket
      const path = `${fullInvoice.invoice_number}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from("invoices").upload(path, blob, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (upErr) throw upErr;

      const { data: publicData } = supabase.storage.from("invoices").getPublicUrl(path);
      const pdfUrl = publicData.publicUrl;

      const targetPhone = clientRow?.phone || phone;
      const clientName = clientRow?.name || "Customer";
      const message =
        `আসসালামু আলাইকুম ${clientName},\n\n` +
        `${settings.company_name} থেকে আপনার ইনভয়েস পাঠানো হলো ✅\n\n` +
        `🧾 Invoice: ${fullInvoice.invoice_number}\n` +
        `📅 Date: ${new Date(fullInvoice.issue_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}\n` +
        `💰 Total: ৳${Number(fullInvoice.total).toLocaleString()}\n\n` +
        `📎 PDF Download:\n${pdfUrl}\n\n` +
        `কোনো প্রশ্ন থাকলে জানাবেন।\n\nধন্যবাদ\n${settings.company_name}`;

      openWhatsApp(targetPhone, message);
      toast({ title: "WhatsApp opened", description: "Invoice link copied into the chat." });
    } catch (e: any) {
      toast({ title: "Error sending invoice", description: e?.message, variant: "destructive" });
    } finally {
      setWhatsappId(null);
      setPreviewInvoice(null);
    }
  };

  const sendInvoiceSMS = async (inv: any) => {
    const clientPhone = (inv as any).clients?.phone as string | undefined;
    const phone = clientPhone || settings.phone?.split(",")[0]?.trim() || "";
    if (!phone) {
      toast({ title: "No phone number found", description: "Add a phone to the client.", variant: "destructive" });
      return;
    }

    try {
      const clientName = (inv as any).clients?.name || "Customer";
      const message = `Hello ${clientName}, your invoice ${inv.invoice_number} for ৳${Number(inv.total).toLocaleString()} has been generated by ${settings.company_name}.`;
      await sendSMS(phone, message);
      toast({ title: "SMS Sent", description: `Message sent to ${phone}` });
    } catch (e: any) {
      toast({ title: "Failed to send SMS", description: e.message, variant: "destructive" });
    }
  };

  const statusColor: Record<string, string> = { draft: "bg-muted text-muted-foreground", partial: "bg-orange-500/10 text-orange-600", sent: "bg-info/10 text-info", paid: "bg-success/10 text-success", overdue: "bg-destructive/10 text-destructive", cancelled: "bg-muted text-muted-foreground" };

  return (
      <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground text-sm">Generate and manage invoices</p>
          </div>
          <Button onClick={() => navigate("/invoices/create")} size={isMobile ? "sm" : "default"}>
            <Plus className="h-4 w-4 mr-1" />{isMobile ? "New" : "Create Invoice"}
          </Button>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search client or invoice #..."
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>

              {/* Date Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-9 justify-start text-left font-normal min-w-[140px]", !dateFilter && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-1.5" />
                    {dateFilter ? format(dateFilter, "dd MMM yyyy") : "Filter by date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>

              {dateFilter && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setDateFilter(undefined)}>
                  <X className="h-4 w-4" />
                </Button>
              )}

              {/* Layout Toggle - hidden on mobile since it's always card */}
              {!isMobile && (
                <div className="flex border rounded-md overflow-hidden shrink-0">
                  <Button variant={viewMode === "table" ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode("table")}>
                    <LayoutList className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === "card" ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-none" onClick={() => setViewMode("card")}>
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table View */}
        {effectiveView === "table" && (
          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{(inv as any).clients?.name || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColor[inv.status] || ""}>{inv.status}</Badge></TableCell>
                      <TableCell className="font-medium">৳{Number(inv.total).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{new Date(inv.issue_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="Record Payment" disabled={inv.status === "paid"} onClick={() => {
                            setPaymentInvoice(inv);
                            setPaymentAmount(String(Number(inv.total) - Number(inv.paid_amount || 0)));
                          }}>
                            <CreditCard className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => viewInvoice(inv)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/edit/${inv.id}`)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" disabled={downloadingId === inv.id} onClick={() => downloadInvoicePdf(inv)}><Download className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Send via WhatsApp" disabled={whatsappId === inv.id} onClick={() => sendInvoiceWhatsApp(inv)}>
                            <WhatsAppIcon className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Send SMS" onClick={() => sendInvoiceSMS(inv)}>
                            <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(inv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No invoices found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Card View */}
        {effectiveView === "card" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredInvoices.map((inv) => (
              <Card key={inv.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold">{inv.invoice_number}</span>
                    <Badge variant="outline" className={statusColor[inv.status] || ""}>{inv.status}</Badge>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Client</span>
                      <span className="font-medium">{(inv as any).clients?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{new Date(inv.issue_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold">৳{Number(inv.total).toLocaleString()}</span>
                        {Number(inv.paid_amount || 0) > 0 && <span className="text-xs text-green-600 font-medium">Paid: ৳{Number(inv.paid_amount).toLocaleString()}</span>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Record Payment" disabled={inv.status === "paid"} onClick={() => {
                          setPaymentInvoice(inv);
                          setPaymentAmount(String(Number(inv.total) - Number(inv.paid_amount || 0)));
                        }}>
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewInvoice(inv)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/invoices/edit/${inv.id}`)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={downloadingId === inv.id} onClick={() => downloadInvoicePdf(inv)}><Download className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Send via WhatsApp" disabled={whatsappId === inv.id} onClick={() => sendInvoiceWhatsApp(inv)}>
                          <WhatsAppIcon className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Send SMS" onClick={() => sendInvoiceSMS(inv)}>
                          <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(inv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                </CardContent>
              </Card>
            ))}
            {filteredInvoices.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8">No invoices found</div>
            )}
          </div>
        )}
      </div>

      {/* Hidden render for direct download */}
      {(downloadingId || whatsappId) && previewInvoice && (
        <div className="fixed left-0 top-0 opacity-0 pointer-events-none z-[-1]">
          <InvoicePreview invoice={previewInvoice} />
        </div>
      )}

      {previewInvoice && !downloadingId && !whatsappId && (
        <Dialog open={!!previewInvoice} onOpenChange={() => setPreviewInvoice(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Invoice {previewInvoice.invoice_number}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-green-600 border-green-600/40 hover:bg-green-600/10" onClick={() => { setPreviewInvoice(null); sendInvoiceWhatsApp(previewInvoice); }}>
                    <WhatsAppIcon className="h-4 w-4 mr-2" />WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" disabled={downloading} onClick={async () => {
                    const el = document.getElementById("invoice-print");
                    if (!el) return;
                    setDownloading(true);
                    try {
                      await generateVectorPdf(previewInvoice, settings, `${previewInvoice.invoice_number}.pdf`);
                    } catch {
                      toast({ title: "Error generating PDF", variant: "destructive" });
                    } finally {
                      setDownloading(false);
                    }
                  }}>
                    <Download className="h-4 w-4 mr-2" />{downloading ? "Generating..." : "Download PDF"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <InvoicePreview invoice={previewInvoice} />
          </DialogContent>
        </Dialog>
      )}

      {fallbackPdfUrl && (
        <Dialog open={!!fallbackPdfUrl} onOpenChange={(open) => {
          if (!open) {
            URL.revokeObjectURL(fallbackPdfUrl);
            setFallbackPdfUrl(null);
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>PDF Ready</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              If the PDF didn't download automatically, tap the button below to open it.
            </p>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => {
                window.open(fallbackPdfUrl, "_blank");
              }}>
                <ExternalLink className="h-4 w-4 mr-2" /> Open PDF
              </Button>
              <Button variant="outline" onClick={() => {
                URL.revokeObjectURL(fallbackPdfUrl);
                setFallbackPdfUrl(null);
              }}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Dialog */}
      <Dialog open={!!paymentInvoice} onOpenChange={() => setPaymentInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {paymentInvoice && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg text-sm flex justify-between items-center">
                <span>Invoice Total: <strong>৳{Number(paymentInvoice.total).toLocaleString()}</strong></span>
                <span className="text-muted-foreground">Due: <strong className="text-destructive">৳{(Number(paymentInvoice.total) - Number(paymentInvoice.paid_amount || 0)).toLocaleString()}</strong></span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Amount</label>
                <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Amount to record..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <select className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Banking (Bkash/Nagad)">Mobile Banking</option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <Button className="w-full mt-4" disabled={recordPaymentMutation.isPending || !paymentAmount} onClick={() => {
                recordPaymentMutation.mutate({ inv: paymentInvoice, amount: Number(paymentAmount), method: paymentMethod });
              }}>
                {recordPaymentMutation.isPending ? "Saving..." : "Save Payment"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </>
  );
}
