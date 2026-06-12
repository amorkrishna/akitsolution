import { useCompanySettings } from "@/hooks/useCompanySettings";
import akLogoDefault from "@/assets/ak-logo.png";

interface InvoicePreviewProps {
  invoice: any;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const { settings } = useCompanySettings();
  const logoSrc = settings.logo_url || akLogoDefault;
  const hasBankInfo = settings.show_payment_info && (settings.bank_name || settings.bank_account_number || settings.mobile_banking);

  return (
    <div
      className="bg-white text-black flex flex-col relative"
      id="invoice-print"
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        width: "210mm",
        minHeight: "297mm",
        padding: "15mm 18mm",
        boxSizing: "border-box",
      }}
    >
      {/* Header with accent bar */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(to right, #1e40af, #0d9488)", borderRadius: "2px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src={logoSrc} alt={settings.company_name} crossOrigin="anonymous" style={{ width: "56px", height: "56px", objectFit: "contain" }} />
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.01em" }}>{settings.company_name}</h2>
              <p style={{ fontSize: "10px", color: "#6b7280", margin: "2px 0 0 0" }}>{settings.company_tagline}</p>
              <div style={{ marginTop: "6px", fontSize: "9px", color: "#6b7280", lineHeight: 1.6, whiteSpace: "pre-line", wordSpacing: "0px", letterSpacing: "normal" }}>
                <p style={{ margin: 0, whiteSpace: "nowrap" }}>📍 {settings.address}</p>
                <p style={{ margin: 0, whiteSpace: "nowrap" }}>📞 {settings.phone}</p>
                <p style={{ margin: 0, whiteSpace: "nowrap" }}>✉️ {settings.email}</p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ backgroundColor: "#1e3a8a", borderRadius: "8px", padding: "10px 16px", textAlign: "center", minWidth: "140px" }}>
              <span style={{ fontSize: "18px", fontWeight: "bold", color: "#ffffff", fontFamily: "Arial, sans-serif" }}>INVOICE</span>
            </div>
            <p style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, marginTop: "6px", color: "#1f2937" }}>{invoice.invoice_number}</p>
            <div style={{ marginTop: "4px", fontSize: "10px", color: "#6b7280" }}>
              <p style={{ margin: "2px 0" }}>Date: <span style={{ fontWeight: 500, color: "#374151" }}>{new Date(invoice.issue_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span></p>
              {invoice.due_date && <p style={{ margin: "2px 0" }}>Due: <span style={{ fontWeight: 500, color: "#374151" }}>{new Date(invoice.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span></p>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: "1px", background: "linear-gradient(to right, transparent, #d1d5db, transparent)", marginBottom: "16px" }} />

      {/* Bill To */}
      <div style={{ marginBottom: "20px", backgroundColor: "#ffffff", borderRadius: "8px", padding: "12px 14px", border: "1px solid #e5e7eb" }}>
        <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", letterSpacing: "0.1em", marginBottom: "4px" }}>Bill To</p>
        <p style={{ fontWeight: 600, color: "#111827", fontSize: "14px", margin: 0 }}>{invoice.clients?.name || "Paid in Cash"}</p>
        {invoice.clients?.address && <p style={{ fontSize: "12px", color: "#4b5563", marginTop: "2px" }}>{invoice.clients.address}</p>}
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", marginBottom: "16px", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#ffffff", color: "#111827", borderBottom: "2px solid #1e40af" }}>
            <th style={{ textAlign: "center", padding: "8px 6px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", width: "30px" }}>#</th>
            <th style={{ textAlign: "left", padding: "8px 8px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</th>
            <th style={{ textAlign: "center", padding: "8px 6px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", width: "56px" }}>Type</th>
            <th style={{ textAlign: "center", padding: "8px 6px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", width: "70px" }}>Warranty</th>
            <th style={{ textAlign: "center", padding: "8px 6px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", width: "36px" }}>Qty</th>
            <th style={{ textAlign: "right", padding: "8px 8px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", width: "80px" }}>Price</th>
            <th style={{ textAlign: "right", padding: "8px 8px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", width: "80px" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((item: any, idx: number) => {
            const isService = item.description?.startsWith("[Service]");
            const isProduct = item.description?.startsWith("[Product]");
            const cleanDesc = item.description?.replace(/^\[(Service|Product)\]\s*/, "").replace(/\s*\(Warranty:.*?\)$/, "").replace(/\s*\(SN:.*?\)/, "") || item.description;
            const warranty = item.description?.match(/\(Warranty:\s*(.*?)\)/)?.[1];
            const serialNumber = item.description?.match(/\(SN:\s*(.*?)\)/)?.[1];
            const itemType = isService ? "Service" : isProduct ? "Product" : "Custom";
            const bgColor = "#ffffff";
            return (
              <tr key={idx} style={{ backgroundColor: bgColor, borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 6px", fontSize: "12px", textAlign: "center", color: "#6b7280", fontWeight: 600 }}>{idx + 1}</td>
                <td style={{ padding: "8px 8px", fontSize: "12px", color: "#1f2937", whiteSpace: "nowrap", wordSpacing: "0px", letterSpacing: "normal", fontFamily: "Arial, Helvetica, sans-serif", fontKerning: "none" }}>
                  <span style={{ whiteSpace: "nowrap", display: "inline-block", wordSpacing: "0px", letterSpacing: "normal" }}>{cleanDesc}</span>
                  {serialNumber && <span style={{ display: "block", fontSize: "9px", color: "#6b7280", marginTop: "1px", whiteSpace: "nowrap", fontFamily: "Arial, Helvetica, sans-serif" }}>SN: {serialNumber}</span>}
                </td>
                <td style={{ padding: "8px 6px", textAlign: "center" }}>
                  <span style={{
                    display: "inline-block", padding: "1px 6px", borderRadius: "9999px", fontSize: "8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                    backgroundColor: isService ? "#dbeafe" : isProduct ? "#d1fae5" : "#fef3c7",
                    color: isService ? "#1d4ed8" : isProduct ? "#047857" : "#92400e",
                  }}>{itemType}</span>
                </td>
                <td style={{ padding: "8px 6px", fontSize: "10px", textAlign: "center", color: "#2563eb", fontWeight: 500 }}>
                  {warranty ? <span>🛡️ {warranty}</span> : <span style={{ color: "#d1d5db" }}>—</span>}
                </td>
                <td style={{ padding: "8px 6px", fontSize: "12px", textAlign: "center", color: "#374151", fontWeight: 500 }}>{item.quantity}</td>
                <td style={{ padding: "8px 8px", fontSize: "12px", textAlign: "right", color: "#374151" }}>৳{Number(item.unit_price).toLocaleString()}</td>
                <td style={{ padding: "8px 8px", fontSize: "12px", textAlign: "right", fontWeight: 600, color: "#111827" }}>৳{Number(item.total).toLocaleString()}</td>
              </tr>
            );
          })}
          {(!invoice.items || invoice.items.length === 0) && (
            <tr><td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "12px" }}>No line items</td></tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <div style={{ width: "240px" }}>
          <div style={{ fontSize: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280", marginBottom: "4px" }}><span>Subtotal</span><span style={{ color: "#374151" }}>৳{Number(invoice.subtotal).toLocaleString()}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280", marginBottom: "4px" }}><span>Tax ({invoice.tax_rate}%)</span><span style={{ color: "#374151" }}>৳{Number(invoice.tax_amount).toLocaleString()}</span></div>
            {Number(invoice.paid_amount || 0) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a", marginBottom: "4px" }}><span>Paid Amount</span><span style={{ fontWeight: 600 }}>৳{Number(invoice.paid_amount).toLocaleString()}</span></div>
            )}
          </div>
          <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "2px solid #1e40af" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: "#111827", fontSize: "15px" }}>{Number(invoice.paid_amount || 0) > 0 ? "Due Amount" : "Total Due"}</span>
              <span style={{ fontWeight: 800, color: "#2563eb", fontSize: "17px" }}>৳{(Number(invoice.total) - Number(invoice.paid_amount || 0)).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Info - only shown if bank details exist */}
      {hasBankInfo && (
        <div style={{ marginBottom: "16px", backgroundColor: "#ffffff", borderRadius: "8px", padding: "12px 14px", border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "#60a5fa", letterSpacing: "0.1em", marginBottom: "6px" }}>Payment Information</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 20px", fontSize: "10px" }}>
            {settings.bank_name && <p style={{ margin: 0 }}><span style={{ color: "#6b7280" }}>Bank:</span> <span style={{ fontWeight: 500, color: "#1f2937" }}>{settings.bank_name}</span></p>}
            {settings.bank_account_name && <p style={{ margin: 0 }}><span style={{ color: "#6b7280" }}>A/C Name:</span> <span style={{ fontWeight: 500, color: "#1f2937" }}>{settings.bank_account_name}</span></p>}
            {settings.bank_account_number && <p style={{ margin: 0 }}><span style={{ color: "#6b7280" }}>A/C No:</span> <span style={{ fontWeight: 500, color: "#1f2937" }}>{settings.bank_account_number}</span></p>}
            {settings.bank_branch && <p style={{ margin: 0 }}><span style={{ color: "#6b7280" }}>Branch:</span> <span style={{ fontWeight: 500, color: "#1f2937" }}>{settings.bank_branch}</span></p>}
            {settings.mobile_banking && (
              <p style={{ margin: 0, gridColumn: "1 / -1" }}>
                <span style={{ color: "#6b7280" }}>Mobile Banking:</span>{" "}
                <span style={{ fontWeight: 500, color: "#1f2937" }}>
                  {settings.mobile_banking.includes("http") ? (
                    <a href={settings.mobile_banking.match(/https?:\/\/[^\s]+/)?.[0] || "#"} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>
                      {settings.mobile_banking}
                    </a>
                  ) : (
                    settings.mobile_banking
                  )}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div style={{ marginBottom: "16px", padding: "10px 12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "#f59e0b", letterSpacing: "0.1em", marginBottom: "3px" }}>Notes</p>
          <p style={{ fontSize: "12px", color: "#374151", margin: 0 }}>{invoice.notes}</p>
        </div>
      )}

      {/* Terms and Conditions */}
      {settings.terms_conditions && (
        <div style={{ marginBottom: "16px", padding: "10px 12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.1em", marginBottom: "3px" }}>Terms & Conditions</p>
          <div style={{ fontSize: "10px", color: "#4b5563", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
            {settings.terms_conditions}
          </div>
        </div>
      )}

      {/* Signature & Footer - pushed to bottom */}
      <div style={{ marginTop: "auto", paddingTop: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", alignItems: "end" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "2px solid #9ca3af", paddingTop: "6px", marginTop: "40px" }} />
            <p style={{ fontSize: "10px", fontWeight: 600, color: "#4b5563", margin: "2px 0" }}>Customer Signature</p>
            <p style={{ fontSize: "8px", color: "#9ca3af", margin: 0 }}>Name & Date</p>
          </div>
          <div style={{ textAlign: "center", paddingBottom: "4px" }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Verification:${invoice.invoice_number}`} 
              alt="QR Code" 
              crossOrigin="anonymous"
              style={{ width: "50px", height: "50px", margin: "0 auto" }} 
            />
            <p style={{ fontSize: "8px", color: "#9ca3af", marginTop: "4px", marginBottom: 0 }}>Scan to Verify</p>
          </div>
          <div style={{ textAlign: "center", position: "relative" }}>
            <div style={{ height: "40px", display: "flex", justifyContent: "center", alignItems: "flex-end", marginBottom: "-5px", zIndex: 10 }}>
              {/* Signature image removed as per user request */}
            </div>
            <div style={{ borderTop: "2px solid #9ca3af", paddingTop: "6px" }} />
            <p style={{ fontSize: "10px", fontWeight: 600, color: "#4b5563", margin: "2px 0" }}>Authorized Signature</p>
            <p style={{ fontSize: "8px", color: "#9ca3af", margin: 0 }}>{settings.company_name}</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "16px", paddingTop: "8px", borderTop: "1px solid #e5e7eb", textAlign: "center" }}>
          <p style={{ fontSize: "9px", color: "#9ca3af", margin: 0 }}>{settings.footer_text} | {settings.company_name} | {settings.phone}</p>
        </div>
      </div>
    </div>
  );
}
