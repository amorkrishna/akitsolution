import fs from 'fs';

const qFile = 'src/pages/Quotations.tsx';
let code = fs.readFileSync(qFile, 'utf8');

// replace html2canvas with autoTable
code = code.replace(/import html2canvas from "html2canvas";/, 'import autoTable from "jspdf-autotable";\nimport { useCompanySettings } from "@/hooks/useCompanySettings";');

// Insert useCompanySettings
code = code.replace(/const { toast } = useToast\(\);/, 'const { toast } = useToast();\n  const { settings } = useCompanySettings();');

// replace old generatePdf
const oldFuncRegex = /const generatePdf = async \([\s\S]*?finally {\s*document\.body\.removeChild\(cloneHost\);\s*}\s*};/g;

const newFunc = `
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
    if (settings.address) { doc.text(\`Address: \${settings.address}\`, 15, y); y += 4; }
    if (settings.phone) { doc.text(\`Phone: \${settings.phone}\`, 15, y); y += 4; }
    if (settings.email) { doc.text(\`Email: \${settings.email}\`, 15, y); y += 4; }

    // Quotation details
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(quotation.quotation_number, pageWidth - 15, 33, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(\`Date: \${new Date(quotation.issue_date).toLocaleDateString("en-GB")}\`, pageWidth - 15, 39, { align: "right" });
    if (quotation.valid_until) {
      doc.text(\`Valid Until: \${new Date(quotation.valid_until).toLocaleDateString("en-GB")}\`, pageWidth - 15, 44, { align: "right" });
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
      const cleanDesc = item.description?.replace(/^\\[(Service|Product)\\]\\s*/, "").replace(/\\s*\\(Warranty:.*?\\)$/, "").replace(/\\s*\\(SN:.*?\\)/, "") || item.description;
      const warranty = item.description?.match(/\\(Warranty:\\s*(.*?)\\)/)?.[1] || "—";
      const itemType = isService ? "Service" : isProduct ? "Product" : "Custom";
      return [
        (idx + 1).toString(),
        cleanDesc,
        itemType,
        warranty,
        item.quantity.toString(),
        \`Tk \${Number(item.unit_price).toLocaleString()}\`,
        \`Tk \${Number(item.total).toLocaleString()}\`
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
    doc.text(\`Tk \${Number(quotation.subtotal).toLocaleString()}\`, rightMargin, y, { align: "right" });
    y += 6;
    
    doc.setTextColor(107, 114, 128);
    doc.text(\`Tax (\${quotation.tax_rate}%):\`, rightMargin - 40, y);
    doc.setTextColor(55, 65, 81);
    doc.text(\`Tk \${Number(quotation.tax_amount).toLocaleString()}\`, rightMargin, y, { align: "right" });
    y += 6;
    
    doc.setDrawColor(13, 148, 136);
    doc.line(rightMargin - 60, y, rightMargin, y);
    y += 8;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text("Total:", rightMargin - 40, y);
    doc.setTextColor(13, 148, 136);
    doc.text(\`Tk \${Number(quotation.total).toLocaleString()}\`, rightMargin, y, { align: "right" });

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

    doc.text(\`\${settings.footer_text || ""} | \${settings.company_name || ""} | \${settings.phone || ""}\`, pageWidth / 2, pageHeight - 10, { align: "center" });

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
`;

code = code.replace(oldFuncRegex, newFunc);
code = code.replace(/await generatePdf\(el, \`Quotation_\$\{q\.quotation_number\}_\$\{clientName\}\.pdf\`\);/g, 'await generateVectorPdf(fullQ, settings, `Quotation_${q.quotation_number}_${clientName}.pdf`);');

fs.writeFileSync(qFile, code);
console.log("Patched Quotations.tsx");
