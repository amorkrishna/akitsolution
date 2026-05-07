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
import { Plus, Trash2, Eye, Printer, Download, Search, CalendarIcon, LayoutGrid, LayoutList, X, ExternalLink, CheckCircle, Circle, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { InvoicePreview } from "@/components/InvoicePreview";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { openWhatsApp } from "@/lib/whatsapp";

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

  const togglePaidMutation = useMutation({
    mutationFn: async (inv: any) => {
      const newStatus = inv.status === "paid" ? "draft" : "paid";
      const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", inv.id);
      if (error) throw error;

      // When marking as paid, decrement stock for each invoice item with a matching product
      if (newStatus === "paid") {
        const { data: invItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
        if (invItems) {
          for (const item of invItems) {
            // Try to find a matching product by name
            const { data: matchedProducts } = await supabase.from("products").select("id, stock_quantity").ilike("name", `%${item.description}%`).limit(1);
            if (matchedProducts && matchedProducts.length > 0) {
              const product = matchedProducts[0];
              const newQty = Math.max(0, product.stock_quantity - item.quantity);
              await supabase.from("products").update({ stock_quantity: newQty }).eq("id", product.id);
              await supabase.from("inventory_movements").insert({
                product_id: product.id,
                movement_type: "out",
                quantity: item.quantity,
                reference_type: "invoice",
                notes: `Invoice ${inv.invoice_number}`,
              });
            }
          }
        }
      }

      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: newStatus === "paid" ? "Marked as Paid ✓ (Stock updated)" : "Marked as Unpaid" });
    },
  });

  const viewInvoice = async (inv: any) => {
    const { data: invItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
    setPreviewInvoice({ ...inv, items: invItems || [] });
  };

  const generateInvoicePdfFromElement = async (
    sourceEl: HTMLElement,
    fileName: string,
    options: { skipDownload?: boolean } = {}
  ): Promise<Blob | null> => {
    const cloneHost = document.createElement("div");
    cloneHost.style.position = "fixed";
    cloneHost.style.left = "-10000px";
    cloneHost.style.top = "0";
    cloneHost.style.width = "794px";
    cloneHost.style.minWidth = "794px";
    cloneHost.style.maxWidth = "794px";
    cloneHost.style.opacity = "1";
    cloneHost.style.pointerEvents = "none";
    cloneHost.style.zIndex = "2147483647";
    cloneHost.style.overflow = "visible";

    const clone = sourceEl.cloneNode(true) as HTMLElement;
    clone.style.width = "794px";
    clone.style.minWidth = "794px";
    clone.style.maxWidth = "794px";
    cloneHost.appendChild(clone);
    document.body.appendChild(cloneHost);

    try {
      if (document.fonts) {
        try { await document.fonts.ready; } catch {}
      }

      // ---- GLOBAL TEXT FIX: Apply consistent rendering to ALL text nodes ----
      const allTextElements = Array.from(clone.querySelectorAll("*")) as HTMLElement[];
      allTextElements.forEach((el) => {
        el.style.wordSpacing = "0px";
        el.style.letterSpacing = "normal";
        el.style.fontKerning = "none";
        el.style.textRendering = "geometricPrecision";
        (el.style as any).webkitFontSmoothing = "antialiased";
      });

      // ---- INVOICE LABEL FIX ----
      const invoiceLabelWrap = clone.querySelector("[data-pdf-invoice-label]") as HTMLElement | null;
      if (invoiceLabelWrap) {
        invoiceLabelWrap.style.overflow = "visible";
        invoiceLabelWrap.style.minWidth = "150px";
        invoiceLabelWrap.style.height = "42px";
        invoiceLabelWrap.style.backgroundColor = "#1e3a8a";
        invoiceLabelWrap.style.display = "inline-flex";
        invoiceLabelWrap.style.alignItems = "center";
        invoiceLabelWrap.style.justifyContent = "center";
        invoiceLabelWrap.style.padding = "10px 16px";
        invoiceLabelWrap.style.borderRadius = "8px";
        invoiceLabelWrap.style.border = "2px solid #1e3a8a";
        invoiceLabelWrap.style.opacity = "1";
        invoiceLabelWrap.style.boxSizing = "border-box";
        invoiceLabelWrap.style.whiteSpace = "nowrap";

        invoiceLabelWrap.style.setProperty("background-color", "#1e3a8a", "important");
        invoiceLabelWrap.style.setProperty("color", "#ffffff", "important");
        invoiceLabelWrap.style.setProperty("-webkit-text-fill-color", "#ffffff", "important");

        // Replace inner content with a fresh span to avoid rendering issues
        invoiceLabelWrap.innerHTML = '';
        const labelSpan = document.createElement('span');
        labelSpan.textContent = 'INVOICE';
        labelSpan.style.cssText = 'font-size:18px;line-height:1;font-weight:900;color:#ffffff;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.06em;-webkit-text-fill-color:#ffffff;display:inline-block;opacity:1;visibility:visible;';
        invoiceLabelWrap.appendChild(labelSpan);
      }

      // ---- INVOICE NUMBER FIX ----
      // The invoice number is the monospace element after the label
      const invoiceNumberEl = clone.querySelector("[data-pdf-invoice-label]")?.parentElement?.querySelector("p[style*='monospace']") as HTMLElement | null;
      if (invoiceNumberEl) {
        invoiceNumberEl.style.fontFamily = "'Courier New', Courier, monospace";
        invoiceNumberEl.style.fontSize = "13px";
        invoiceNumberEl.style.fontWeight = "700";
        invoiceNumberEl.style.whiteSpace = "nowrap";
        invoiceNumberEl.style.letterSpacing = "0.02em";
        invoiceNumberEl.style.color = "#1f2937";
      }

      // ---- TAGLINE FIX ----
      // Find the company tagline (small text under company name)
      const headerTextBlocks = Array.from(clone.querySelectorAll("p, span, div")) as HTMLElement[];
      headerTextBlocks.forEach((el) => {
        const text = el.textContent || "";
        const fontSize = el.style.fontSize;
        // Target tagline and address/phone/email lines
        if (fontSize === "10px" || fontSize === "9px" || fontSize === "8px") {
          el.style.whiteSpace = "nowrap";
          el.style.wordSpacing = "0px";
          el.style.letterSpacing = "normal";
          el.style.fontKerning = "none";
          el.style.textRendering = "geometricPrecision";
          el.style.fontFamily = "Helvetica, Arial, sans-serif";
        }
      });

      // ---- SERVICE/ITEM NAME FIX ----
      const serviceNameCells = Array.from(clone.querySelectorAll("tbody tr td:nth-child(2)")) as HTMLElement[];
      serviceNameCells.forEach((node) => {
        node.style.whiteSpace = "normal";
        node.style.wordBreak = "keep-all";
        node.style.overflowWrap = "normal";
        node.style.wordSpacing = "0px";
        node.style.letterSpacing = "0";
        node.style.fontKerning = "none";
        node.style.textRendering = "geometricPrecision";
        node.style.textAlign = "left";
        node.style.fontFamily = "Helvetica, Arial, sans-serif";
      });

      const serviceNameTexts = Array.from(clone.querySelectorAll("tbody tr td:nth-child(2) span:first-child")) as HTMLElement[];
      serviceNameTexts.forEach((node) => {
        node.style.whiteSpace = "normal";
        node.style.wordBreak = "keep-all";
        node.style.overflowWrap = "normal";
        node.style.wordSpacing = "0px";
        node.style.letterSpacing = "0";
        node.style.fontKerning = "none";
        node.style.display = "inline";
        node.style.fontFamily = "Helvetica, Arial, sans-serif";
      });

      // ---- IMAGE PRELOADING ----
      const images = Array.from(clone.querySelectorAll("img")) as HTMLImageElement[];
      await Promise.all(images.map(async (img) => {
        if (!img.complete) await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });
        const src = img.currentSrc || img.src;
        if (!src || src.startsWith("data:")) return;
        try {
          const response = await fetch(src, { mode: "cors" });
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject();
            reader.readAsDataURL(blob);
          });
          img.src = dataUrl;
          if (!img.complete) await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });
        } catch {}
      }));

      // Wait for layout to stabilize
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      await new Promise((r) => setTimeout(r, 600));

      // Force layout recalculation
      const cloneRect = clone.getBoundingClientRect();
      const captureWidth = 794;
      const captureHeight = Math.max(Math.ceil(cloneRect.height), clone.scrollHeight, 1123);
      // Use fixed scale of 3 for consistent quality across devices
      const renderScale = 3;

      const canvas = await html2canvas(clone, {
        scale: renderScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        imageTimeout: 15000,
        logging: false,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        scrollX: 0,
        scrollY: 0,
      });

      let labelCanvasBounds: { x: number; y: number; w: number; h: number } | null = null;

      // Final fail-safe: paint INVOICE badge directly on canvas if html2canvas skips text
      if (invoiceLabelWrap) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const labelRect = invoiceLabelWrap.getBoundingClientRect();
          const rootRect = clone.getBoundingClientRect();
          const scaleX = canvas.width / captureWidth;
          const scaleY = canvas.height / captureHeight;
          const x = (labelRect.left - rootRect.left) * scaleX;
          const y = (labelRect.top - rootRect.top) * scaleY;
          const w = labelRect.width * scaleX;
          const h = labelRect.height * scaleY;
          labelCanvasBounds = { x, y, w, h };
          const r = Math.min(16 * scaleY, h / 2);

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.fillStyle = "#1e3a8a";
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = `900 ${Math.max(18 * scaleY, 36)}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("INVOICE", x + w / 2, y + h / 2);
          ctx.restore();
        }
      }

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);

      // Absolute final guard: draw the INVOICE text directly in PDF coordinates
      if (labelCanvasBounds) {
        const xMm = (labelCanvasBounds.x / canvas.width) * pdfW;
        const yMm = (labelCanvasBounds.y / canvas.height) * pdfH;
        const wMm = (labelCanvasBounds.w / canvas.width) * pdfW;
        const hMm = (labelCanvasBounds.h / canvas.height) * pdfH;

        pdf.setFillColor(30, 58, 138);
        pdf.roundedRect(xMm, yMm, wMm, hMm, 2, 2, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(Math.max(14, Math.min(18, hMm * 1.6)));
        pdf.text("INVOICE", xMm + wMm / 2, yMm + hMm * 0.64, { align: "center" });
      }
      
      const pdfBlob = pdf.output("blob");
      if (options.skipDownload) {
        return pdfBlob;
      }
      const shareNavigator = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      const isMobileUa = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      if (isMobileUa && shareNavigator.share) {
        const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });
        if (!shareNavigator.canShare || shareNavigator.canShare({ files: [pdfFile] })) {
          try {
            await shareNavigator.share({ files: [pdfFile], title: fileName });
            return;
          } catch {}
        }
      }

      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);

      if (isIOS) {
        const opened = window.open(blobUrl, "_blank");
        if (!opened) {
          link.click();
          setFallbackPdfUrl(blobUrl);
        }
      } else if (isMobileUa) {
        link.click();
        setFallbackPdfUrl(blobUrl);
      } else {
        link.click();
      }

      window.setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        if (!isMobileUa) URL.revokeObjectURL(blobUrl);
      }, 30000);
    } finally {
      document.body.removeChild(cloneHost);
    }
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

      await generateInvoicePdfFromElement(el, `${fullInvoice.invoice_number}.pdf`);
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

      const blob = await generateInvoicePdfFromElement(el, `${fullInvoice.invoice_number}.pdf`, { skipDownload: true });
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

  const statusColor: Record<string, string> = { draft: "bg-muted text-muted-foreground", sent: "bg-info/10 text-info", paid: "bg-success/10 text-success", overdue: "bg-destructive/10 text-destructive", cancelled: "bg-muted text-muted-foreground" };

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
                          <Button variant="ghost" size="icon" title={inv.status === "paid" ? "Mark Unpaid" : "Mark Paid"} onClick={() => togglePaidMutation.mutate(inv)}>
                            {inv.status === "paid" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => viewInvoice(inv)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/edit/${inv.id}`)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" disabled={downloadingId === inv.id} onClick={() => downloadInvoicePdf(inv)}><Download className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Send via WhatsApp" disabled={whatsappId === inv.id} onClick={() => sendInvoiceWhatsApp(inv)}>
                            <WhatsAppIcon className="h-4 w-4 text-green-600" />
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
                    <span className="text-lg font-bold">৳{Number(inv.total).toLocaleString()}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title={inv.status === "paid" ? "Mark Unpaid" : "Mark Paid"} onClick={() => togglePaidMutation.mutate(inv)}>
                        {inv.status === "paid" ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewInvoice(inv)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/invoices/edit/${inv.id}`)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={downloadingId === inv.id} onClick={() => downloadInvoicePdf(inv)}><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Send via WhatsApp" disabled={whatsappId === inv.id} onClick={() => sendInvoiceWhatsApp(inv)}>
                        <WhatsAppIcon className="h-4 w-4 text-green-600" />
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
                      await generateInvoicePdfFromElement(el, `${previewInvoice.invoice_number}.pdf`);
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

      {/* Mobile PDF Fallback Dialog */}
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
      </>
  );
}
