import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Search, Building2, ChevronRight, Phone, MapPin, Download } from "lucide-react";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { format } from "date-fns";

export default function Suppliers() {
  const [search, setSearch] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch all suppliers
  const { data: suppliers, isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch ledger for selected supplier
  const { data: ledger, isLoading: loadingLedger } = useQuery({
    queryKey: ['supplier-ledger', selectedSupplierId],
    queryFn: async () => {
      if (!selectedSupplierId) return null;
      const { data, error } = await supabase
        .from('purchases')
        .select('*, purchase_items(total_price, quantity)')
        .eq('supplier_id', selectedSupplierId)
        .order('purchase_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSupplierId
  });

  const selectedSupplier = suppliers?.find(s => s.id === selectedSupplierId);

  const filteredSuppliers = suppliers?.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) || 
    s.phone?.includes(search)
  ) || [];

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Supplier_Ledger_${selectedSupplier?.name || "Statement"}`,
  });

  const handleDownloadPdf = () => {
    const element = printRef.current;
    if (!element) return;

    // Make the hidden template visible momentarily for html2canvas
    const originalDisplay = element.style.display;
    element.style.display = 'block';

    const opt = {
      margin:       0.5,
      filename:     `Supplier_Ledger_${selectedSupplier?.name || 'Statement'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      element.style.display = originalDisplay;
    });
  };

  const totalPurchased = ledger?.reduce((sum, p) => sum + Number(p.total_cost), 0) || 0;
  const totalPaid = ledger?.reduce((sum, p) => sum + Number(p.paid_amount), 0) || 0;
  const totalDue = totalPurchased - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center hide-on-print">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suppliers & Vendors</h2>
          <p className="text-muted-foreground">Manage your supplier ledgers, statements, and balances.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Supplier List */}
        <Card className="md:col-span-1 hide-on-print">
          <CardHeader>
            <CardTitle>Supplier List</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search supplier..." 
                className="pl-8" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {loadingSuppliers ? (
                <p className="text-center py-4 text-muted-foreground">Loading...</p>
              ) : filteredSuppliers.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No suppliers found.</p>
              ) : (
                <div className="flex flex-col">
                  {filteredSuppliers.map(supplier => (
                    <button
                      key={supplier.id}
                      onClick={() => setSelectedSupplierId(supplier.id)}
                      className={`flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors text-left ${selectedSupplierId === supplier.id ? 'bg-muted/80 border-l-4 border-l-blue-600' : ''}`}
                    >
                      <div>
                        <p className="font-semibold">{supplier.name}</p>
                        {supplier.phone && <p className="text-xs text-muted-foreground">{supplier.phone}</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Ledger View */}
        <Card className="md:col-span-2">
          {selectedSupplierId ? (
            <>
              <CardHeader className="flex flex-row items-start justify-between border-b pb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-blue-600" />
                    {selectedSupplier?.name}
                  </h2>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    {selectedSupplier?.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3"/> {selectedSupplier.phone}</p>}
                    {selectedSupplier?.address && <p className="flex items-center gap-1"><MapPin className="h-3 w-3"/> {selectedSupplier.address}</p>}
                  </div>
                </div>
                <div className="flex gap-2 hide-on-print">
                  <Button variant="outline" onClick={() => handlePrint()}>
                    <Printer className="mr-2 h-4 w-4" /> Print Ledger
                  </Button>
                  <Button variant="default" onClick={handleDownloadPdf}>
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                
                {/* Ledger Summary */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Purchased</p>
                    <p className="text-2xl font-bold mt-1">৳{totalPurchased.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Paid</p>
                    <p className="text-2xl font-bold mt-1">৳{totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Due</p>
                    <p className="text-2xl font-bold mt-1">৳{totalDue.toLocaleString()}</p>
                  </div>
                </div>

                <h3 className="font-bold text-lg mb-4">Transaction History</h3>
                
                {loadingLedger ? (
                  <p className="text-center py-8">Loading ledger...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference/Note</TableHead>
                        <TableHead className="text-right">Bill Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger?.map((purchase: any) => {
                        const due = Number(purchase.total_cost) - Number(purchase.paid_amount);
                        return (
                          <TableRow key={purchase.id}>
                            <TableCell className="font-medium">
                              {format(new Date(purchase.purchase_date), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>{purchase.notes || 'Purchase Invoice'}</TableCell>
                            <TableCell className="text-right font-semibold">৳{Number(purchase.total_cost).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-emerald-600">৳{Number(purchase.paid_amount).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-red-600 font-bold">৳{due.toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                      {ledger?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No transactions found for this supplier.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}

              </CardContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
              <Building2 className="h-16 w-16 mb-4 opacity-20" />
              <p>Select a supplier from the list to view their ledger.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Hidden Professional Print Template */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} className="print-template" style={{ padding: '40px', backgroundColor: 'white', color: 'black', width: '800px', maxWidth: '100%' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0', color: '#1a1a1a' }}>AK IT SOLUTION</h1>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>CCTV | Attendance Devices | IT Services</p>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginTop: '20px', letterSpacing: '1px', textTransform: 'uppercase' }}>Supplier Ledger Statement</h2>
          </div>

          {/* Supplier Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#666' }}>Billed To:</h3>
              <p style={{ margin: '0', fontWeight: 'bold', fontSize: '18px' }}>{selectedSupplier?.name}</p>
              {selectedSupplier?.phone && <p style={{ margin: '5px 0 0 0' }}>Phone: {selectedSupplier.phone}</p>}
              {selectedSupplier?.address && <p style={{ margin: '5px 0 0 0', whiteSpace: 'pre-wrap' }}>Address: {selectedSupplier.address}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 5px 0' }}><strong>Date:</strong> {format(new Date(), 'dd MMM yyyy')}</p>
            </div>
          </div>

          {/* Summary Boxes */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            <div style={{ flex: 1, padding: '15px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Total Purchased</p>
              <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>৳{totalPurchased.toLocaleString()}</p>
            </div>
            <div style={{ flex: 1, padding: '15px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#166534', textTransform: 'uppercase' }}>Total Paid</p>
              <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: '#14532d' }}>৳{totalPaid.toLocaleString()}</p>
            </div>
            <div style={{ flex: 1, padding: '15px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#991b1b', textTransform: 'uppercase' }}>Balance Due</p>
              <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: '#7f1d1d' }}>৳{totalDue.toLocaleString()}</p>
            </div>
          </div>

          {/* Transactions Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: '#334155', fontWeight: '600' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#334155', fontWeight: '600' }}>Reference / Notes</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#334155', fontWeight: '600' }}>Bill Amount</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#334155', fontWeight: '600' }}>Paid</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#334155', fontWeight: '600' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger?.map((purchase: any) => {
                const due = Number(purchase.total_cost) - Number(purchase.paid_amount);
                return (
                  <tr key={purchase.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px' }}>{format(new Date(purchase.purchase_date), 'dd MMM yyyy')}</td>
                    <td style={{ padding: '12px' }}>{purchase.notes || 'Purchase Invoice'}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>৳{Number(purchase.total_cost).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#16a34a' }}>৳{Number(purchase.paid_amount).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }}>৳{due.toLocaleString()}</td>
                  </tr>
                );
              })}
              {ledger?.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center', color: '#666', fontSize: '12px' }}>
            <p>This is a computer-generated document. No signature is required.</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page { size: auto; margin: 10mm; }
          body {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            color: #000000 !important;
          }
          body > :not(.print-template) {
            display: none !important;
          }
          .print-template {
            display: block !important;
            width: 100% !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
