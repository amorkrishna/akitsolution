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
    <div className="w-full flex justify-center bg-gray-50/50 py-4 sm:py-8 dark:bg-transparent">
      {/* 
        The container is responsive for screen viewing, but for printing (print:*), 
        it strictly adheres to A4 (210x297mm) formats and removes shadows. 
      */}
      <div
        id="invoice-print"
        className="
          bg-white text-black relative flex flex-col 
          w-full max-w-3xl sm:rounded-xl sm:shadow-lg sm:border sm:border-gray-200
          p-4 sm:p-8 md:p-12
          print:w-[210mm] print:min-h-[297mm] print:shadow-none print:rounded-none print:border-none print:p-[15mm_18mm]
        "
        style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", boxSizing: "border-box" }}
      >
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 sm:rounded-t-xl print:rounded-none bg-gradient-to-r from-blue-700 via-teal-500 to-emerald-500" />

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start pt-4 sm:pt-2 print:flex-row print:pt-3 mb-6 sm:mb-8 print:mb-4 gap-6 sm:gap-0">
          
          {/* Company Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 print:flex-row print:items-center print:gap-3">
            <img 
              src={logoSrc} 
              alt={settings.company_name} 
              crossOrigin="anonymous" 
              className="w-14 h-14 sm:w-16 sm:h-16 print:w-14 print:h-14 object-contain rounded-md" 
            />
            <div>
              <h2 className="text-xl sm:text-2xl print:text-[18px] font-bold text-gray-900 m-0 tracking-tight leading-none">
                {settings.company_name}
              </h2>
              <p className="text-xs sm:text-sm print:text-[10px] text-gray-500 mt-1 mb-0 font-medium">
                {settings.company_tagline}
              </p>
              <div className="mt-2 sm:mt-3 print:mt-1.5 text-xs print:text-[9px] text-gray-500 leading-relaxed space-y-0.5 print:space-y-0">
                <p className="m-0 flex items-center gap-1.5"><span className="text-gray-400">📍</span> {settings.address}</p>
                <p className="m-0 flex items-center gap-1.5"><span className="text-gray-400">📞</span> {settings.phone}</p>
                <p className="m-0 flex items-center gap-1.5"><span className="text-gray-400">✉️</span> {settings.email}</p>
              </div>
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="text-left sm:text-right print:text-right shrink-0 w-full sm:w-auto print:w-auto bg-gray-50 sm:bg-transparent print:bg-transparent p-4 sm:p-0 print:p-0 rounded-lg sm:rounded-none">
            <div className="inline-flex sm:flex items-center justify-center min-w-[120px] sm:min-w-[140px] print:min-w-[140px] h-10 sm:h-11 print:h-11 bg-blue-900 rounded-md sm:rounded-lg mb-2 sm:mb-0">
              <span className="text-base sm:text-lg print:text-[18px] font-bold text-white tracking-widest uppercase m-0 px-4">
                INVOICE
              </span>
            </div>
            <p className="font-mono text-sm sm:text-base print:text-[13px] font-bold mt-0 sm:mt-2 print:mt-1.5 text-gray-800">
              {invoice.invoice_number}
            </p>
            <div className="mt-2 sm:mt-3 print:mt-1 text-xs sm:text-sm print:text-[10px] text-gray-500 space-y-1 print:space-y-0.5">
              <p className="m-0 flex sm:justify-end print:justify-end gap-2">
                <span>Date:</span> 
                <span className="font-semibold text-gray-700">
                  {new Date(invoice.issue_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </p>
              {invoice.due_date && (
                <p className="m-0 flex sm:justify-end print:justify-end gap-2">
                  <span>Due:</span> 
                  <span className="font-semibold text-gray-700">
                    {new Date(invoice.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-6 sm:mb-8 print:mb-4" />

        {/* Bill To */}
        <div className="mb-6 sm:mb-8 print:mb-5 bg-white rounded-xl p-4 sm:p-5 print:p-4 border border-gray-200">
          <p className="text-[10px] sm:text-xs print:text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-2 print:mb-2">
            Bill To
          </p>
          <p className="font-semibold text-gray-900 text-base sm:text-lg print:text-[15px] m-0">
            {invoice.clients?.name || "Paid in Cash"}
          </p>
          {invoice.clients?.address && (
            <p className="text-xs sm:text-sm print:text-[12px] text-gray-600 mt-1 print:mt-1">
              {invoice.clients.address}
            </p>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-8 sm:mb-10 print:mb-6 overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-blue-800">
                <th className="text-left py-2 sm:py-3 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-[10px] sm:text-xs print:text-[10px] font-bold uppercase tracking-wider text-gray-600 w-8 sm:w-10 print:w-[25px]">#</th>
                <th className="text-left py-2 sm:py-3 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-[10px] sm:text-xs print:text-[10px] font-bold uppercase tracking-wider text-gray-600">Description</th>
                <th className="text-center py-2 sm:py-3 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-[10px] sm:text-xs print:text-[10px] font-bold uppercase tracking-wider text-gray-600 w-20 sm:w-24 print:w-[60px] whitespace-nowrap">Type</th>
                <th className="text-center py-2 sm:py-3 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-[10px] sm:text-xs print:text-[10px] font-bold uppercase tracking-wider text-gray-600 w-20 sm:w-24 print:w-[60px] whitespace-nowrap">Warranty</th>
                <th className="text-center py-2 sm:py-3 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-[10px] sm:text-xs print:text-[10px] font-bold uppercase tracking-wider text-gray-600 w-12 sm:w-16 print:w-[35px]">Qty</th>
                <th className="text-right py-2 sm:py-3 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-[10px] sm:text-xs print:text-[10px] font-bold uppercase tracking-wider text-gray-600 w-20 sm:w-28 print:w-[70px] whitespace-nowrap">Price</th>
                <th className="text-right py-2 sm:py-3 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-[10px] sm:text-xs print:text-[10px] font-bold uppercase tracking-wider text-gray-600 w-24 sm:w-32 print:w-[80px] whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items?.map((item: any, idx: number) => {
                const isService = item.description?.startsWith("[Service]");
                const isProduct = item.description?.startsWith("[Product]");
                const cleanDesc = item.description?.replace(/^\[(Service|Product)\]\s*/, "").replace(/\s*\(Warranty:.*?\)$/, "").replace(/\s*\(SN:.*?\)/, "") || item.description;
                const warranty = item.description?.match(/\(Warranty:\s*(.*?)\)/)?.[1];
                const serialNumber = item.description?.match(/\(SN:\s*(.*?)\)/)?.[1];
                const itemType = isService ? "Service" : isProduct ? "Product" : "";
                
                return (
                  <tr key={idx} className="bg-white">
                    <td className="py-3 sm:py-4 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-xs sm:text-sm print:text-[11px] text-left text-gray-500 font-medium align-middle whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="py-3 sm:py-4 print:py-1.5 px-2 sm:px-3 print:px-1.5 align-middle">
                      <div className="text-xs sm:text-sm print:text-[11px] print:leading-tight text-gray-800 font-medium">
                        {cleanDesc}
                        {serialNumber && (
                          <span className="text-[10px] print:text-[9px] text-gray-500 ml-2 bg-gray-100 print:bg-transparent px-1 rounded print:p-0 whitespace-nowrap">
                            SN: {serialNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 sm:py-4 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-center align-middle whitespace-nowrap">
                      {itemType && (
                        <span className={`inline-block px-2 sm:px-3 print:px-1.5 py-0.5 sm:py-1 print:py-0.5 rounded-full text-[8px] sm:text-[9px] print:text-[8px] font-bold uppercase tracking-widest ${isService ? "bg-blue-100 text-blue-700" : "bg-emerald-100/60 text-emerald-700"}`}>
                          {itemType}
                        </span>
                      )}
                    </td>
                    <td className="py-3 sm:py-4 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-xs sm:text-sm print:text-[11px] text-center text-gray-600 align-middle whitespace-nowrap">
                      {warranty ? warranty : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 sm:py-4 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-xs sm:text-sm print:text-[11px] text-center text-gray-800 font-bold align-middle whitespace-nowrap">
                      {item.quantity}
                    </td>
                    <td className="py-3 sm:py-4 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-xs sm:text-sm print:text-[11px] text-right text-gray-600 align-middle whitespace-nowrap">
                      ৳{Number(item.unit_price).toLocaleString()}
                    </td>
                    <td className="py-3 sm:py-4 print:py-1.5 px-2 sm:px-3 print:px-1.5 text-xs sm:text-sm print:text-[11px] text-right font-bold text-gray-900 align-middle whitespace-nowrap">
                      ৳{Number(item.total).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {(!invoice.items || invoice.items.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 text-sm">
                    No line items added yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="border-t border-gray-100 w-full" />
        </div>

        {/* Totals */}
        <div className="flex flex-col sm:flex-row justify-end mb-8 sm:mb-12 print:mb-8">
          <div className="w-full sm:w-72 print:w-[260px]">
            <div className="text-sm print:text-[13px] space-y-2 print:space-y-1.5 pb-2 print:pb-2 border-b-2 border-blue-800">
              <div className="flex justify-between text-gray-500 font-medium">
                <span>Subtotal</span>
                <span className="text-gray-800">৳{Number(invoice.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500 font-medium">
                <span>Tax ({invoice.tax_rate}%)</span>
                <span className="text-gray-800">৳{Number(invoice.tax_amount).toLocaleString()}</span>
              </div>
              {Number(invoice.paid_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Paid Amount</span>
                  <span>৳{Number(invoice.paid_amount).toLocaleString()}</span>
                </div>
              )}
            </div>
            <div className="mt-3 print:mt-2.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900 text-base sm:text-lg print:text-[16px]">
                  {Number(invoice.paid_amount || 0) > 0 ? "Due Amount" : "Total Due"}
                </span>
                <span className="font-black text-blue-600 text-xl sm:text-2xl print:text-[20px]">
                  ৳{(Number(invoice.total) - Number(invoice.paid_amount || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 sm:gap-6 print:gap-4 mb-6 sm:mb-8 print:mb-4">
          {/* Payment Info */}
          {hasBankInfo && (
            <div className="bg-blue-50/50 print:bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 print:p-3 border border-blue-100 print:border-gray-200">
              <p className="text-[10px] sm:text-xs print:text-[9px] font-bold uppercase text-blue-500 tracking-wider mb-2 sm:mb-3 print:mb-1.5">
                Payment Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-4 gap-y-1.5 sm:gap-y-2 print:gap-y-0.5 text-xs sm:text-sm print:text-[10px]">
                {settings.bank_name && <p className="m-0"><span className="text-gray-500">Bank:</span> <span className="font-medium text-gray-900">{settings.bank_name}</span></p>}
                {settings.bank_account_name && <p className="m-0"><span className="text-gray-500">A/C Name:</span> <span className="font-medium text-gray-900">{settings.bank_account_name}</span></p>}
                {settings.bank_account_number && <p className="m-0"><span className="text-gray-500">A/C No:</span> <span className="font-medium text-gray-900">{settings.bank_account_number}</span></p>}
                {settings.bank_branch && <p className="m-0"><span className="text-gray-500">Branch:</span> <span className="font-medium text-gray-900">{settings.bank_branch}</span></p>}
                {settings.mobile_banking && (
                  <p className="m-0 col-span-1 sm:col-span-2 print:col-span-2">
                    <span className="text-gray-500">Mobile Banking:</span>{" "}
                    <span className="font-medium text-gray-900">
                      {settings.mobile_banking.includes("http") ? (
                        <a href={settings.mobile_banking.match(/https?:\/\/[^\s]+/)?.[0] || "#"} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline print:no-underline">
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

          <div className="space-y-4 sm:space-y-6 print:space-y-4">
            {/* Notes */}
            {invoice.notes && (
              <div className="bg-amber-50/50 print:bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 print:p-3 border border-amber-100 print:border-gray-200">
                <p className="text-[10px] sm:text-xs print:text-[9px] font-bold uppercase text-amber-500 tracking-wider mb-1 sm:mb-2 print:mb-1">
                  Notes
                </p>
                <p className="text-xs sm:text-sm print:text-[12px] text-gray-700 m-0 leading-relaxed">
                  {invoice.notes}
                </p>
              </div>
            )}

            {/* Terms and Conditions */}
            {settings.terms_conditions && (
              <div className="bg-gray-50/50 print:bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 print:p-3 border border-gray-100 print:border-gray-200">
                <p className="text-[10px] sm:text-xs print:text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1 sm:mb-2 print:mb-1">
                  Terms & Conditions
                </p>
                <div className="text-[10px] sm:text-xs print:text-[10px] text-gray-500 whitespace-pre-wrap leading-relaxed">
                  {settings.terms_conditions}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Signature & Footer - Pushed to bottom */}
        <div className="mt-auto pt-8 sm:pt-12 print:pt-6">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 print:gap-6 items-end">
            <div className="text-center">
              <div className="border-t-2 border-gray-300 pt-2 sm:pt-3 print:pt-1.5 mt-8 sm:mt-12 print:mt-10" />
              <p className="text-[10px] sm:text-xs print:text-[10px] font-semibold text-gray-600 m-0 mt-1">Customer Signature</p>
              <p className="text-[9px] sm:text-[10px] print:text-[8px] text-gray-400 m-0">Name & Date</p>
            </div>
            
            <div className="text-center flex flex-col items-center justify-end pb-1 print:pb-1">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Verification:${invoice.invoice_number}`} 
                alt="QR Code" 
                crossOrigin="anonymous"
                className="w-12 h-12 sm:w-16 sm:h-16 print:w-[50px] print:h-[50px] mix-blend-multiply opacity-80" 
              />
              <p className="text-[9px] sm:text-[10px] print:text-[8px] text-gray-400 mt-1.5 sm:mt-2 print:mt-1 mb-0">Scan to Verify</p>
            </div>
            
            <div className="text-center relative">
              <div className="h-10 sm:h-12 print:h-[40px] flex justify-center items-end -mb-1 sm:-mb-2 print:-mb-[5px] z-10" />
              <div className="border-t-2 border-gray-300 pt-2 sm:pt-3 print:pt-1.5" />
              <p className="text-[10px] sm:text-xs print:text-[10px] font-semibold text-gray-600 m-0 mt-1">Authorized Signature</p>
              <p className="text-[9px] sm:text-[10px] print:text-[8px] text-gray-400 m-0">{settings.company_name}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 print:mt-4 pt-3 sm:pt-4 print:pt-2 border-t border-gray-200 text-center">
            <p className="text-[9px] sm:text-[10px] print:text-[9px] text-gray-400 m-0 font-medium tracking-wide">
              {settings.footer_text} | <span className="text-gray-500">{settings.company_name}</span> | {settings.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

