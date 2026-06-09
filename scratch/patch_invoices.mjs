import fs from 'fs';

const invoicesFile = 'src/pages/Invoices.tsx';
let code = fs.readFileSync(invoicesFile, 'utf8');

// replace html2canvas with autoTable
code = code.replace(/import html2canvas from "html2canvas";/, 'import autoTable from "jspdf-autotable";');

const oldFuncRegex = /const generateInvoicePdfFromElement[\s\S]*?finally {\s*document\.body\.removeChild\(cloneHost\);\s*}\s*};/g;

const newFunc = `
  const generateVectorPdf = async (
    invoice: any,
    settings: any,
    fileName: string,
    options: { skipDownload?: boolean } = {}
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

    // Invoice details
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(invoice.invoice_number, pageWidth - 15, 33, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(\`Date: \${new Date(invoice.issue_date).toLocaleDateString("en-GB")}\`, pageWidth - 15, 39, { align: "right" });
    if (invoice.due_date) {
      doc.text(\`Due: \${new Date(invoice.due_date).toLocaleDateString("en-GB")}\`, pageWidth - 15, 44, { align: "right" });
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
      const cleanDesc = item.description?.replace(/^\\[(Service|Product)\\]\\s*/, "").replace(/\\s*\\(Warranty:.*?\\)$/, "").replace(/\\s*\\(SN:.*?\\)/, "") || item.description;
      const warranty = item.description?.match(/\\(Warranty:\\s*(.*?)\\)/)?.[1] || "—";
      const sn = item.description?.match(/\\(SN:\\s*(.*?)\\)/)?.[1] || "";
      const itemType = isService ? "Service" : isProduct ? "Product" : "Custom";
      let descText = cleanDesc;
      if (sn) descText += \`\\nSN: \${sn}\`;
      return [
        (idx + 1).toString(),
        descText,
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
    doc.text(\`Tk \${Number(invoice.subtotal).toLocaleString()}\`, rightMargin, y, { align: "right" });
    y += 6;
    
    doc.setTextColor(107, 114, 128);
    doc.text(\`Tax (\${invoice.tax_rate}%):\`, rightMargin - 40, y);
    doc.setTextColor(55, 65, 81);
    doc.text(\`Tk \${Number(invoice.tax_amount).toLocaleString()}\`, rightMargin, y, { align: "right" });
    y += 6;
    
    doc.setDrawColor(30, 58, 138);
    doc.line(rightMargin - 60, y, rightMargin, y);
    y += 8;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text("Total Due:", rightMargin - 40, y);
    doc.setTextColor(37, 99, 235);
    doc.text(\`Tk \${Number(invoice.total).toLocaleString()}\`, rightMargin, y, { align: "right" });

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
      if (settings.bank_name) { doc.text(\`Bank: \${settings.bank_name}\`, 15, leftY); leftY += 4; }
      if (settings.bank_account_name) { doc.text(\`A/C Name: \${settings.bank_account_name}\`, 15, leftY); leftY += 4; }
      if (settings.bank_account_number) { doc.text(\`A/C No: \${settings.bank_account_number}\`, 15, leftY); leftY += 4; }
      if (settings.bank_branch) { doc.text(\`Branch: \${settings.bank_branch}\`, 15, leftY); leftY += 4; }
      if (settings.mobile_banking) { doc.text(\`Mobile Banking: \${settings.mobile_banking}\`, 15, leftY); leftY += 4; }
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
    doc.text("Customer Signature", 55, sigY + 5, { align: "center" });

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
code = code.replace(/await generateInvoicePdfFromElement\(el, \`\$\{fullInvoice\.invoice_number\}\.pdf\`\);/g, 'await generateVectorPdf(fullInvoice, settings, `${fullInvoice.invoice_number}.pdf`);');
code = code.replace(/await generateInvoicePdfFromElement\(el, \`\$\{fullInvoice\.invoice_number\}\.pdf\`, \{ skipDownload: true \}\);/g, 'await generateVectorPdf(fullInvoice, settings, `${fullInvoice.invoice_number}.pdf`, { skipDownload: true });');
code = code.replace(/await generateInvoicePdfFromElement\(el, \`\$\{previewInvoice\.invoice_number\}\.pdf\`\);/g, 'await generateVectorPdf(previewInvoice, settings, `${previewInvoice.invoice_number}.pdf`);');

fs.writeFileSync(invoicesFile, code);
console.log("Patched Invoices.tsx");
