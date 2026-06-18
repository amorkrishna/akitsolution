import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Search, AlertTriangle, CheckCircle2, Scan, Package, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { BarcodeScanner } from "@/components/BarcodeScanner";

export default function WarrantyCheck() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();

  const handleCheck = async (serialQuery: string = serial) => {
    if (!serialQuery.trim()) {
      toast({ title: "Please enter a serial number", variant: "destructive" });
      return;
    }

    setLoading(true);
    setScanned(true);
    setResult(null);
    setShowScanner(false);
    
    try {
      const { data, error } = await supabase
        .from("product_serials")
        .select(`
          id, serial_number, status, warranty_end_date,
          products (name, category, brand, warranty_months),
          sales (sale_date, invoice_id, clients (name, phone))
        `)
        .eq("serial_number", serialQuery)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
         setResult(null);
         toast({ title: "Serial Not Found", description: "No product found with this serial number.", variant: "destructive" });
      } else {
         setResult(data);
      }
    } catch (err: any) {
      toast({ title: "Error checking warranty", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeDetected = (sku: string) => {
    setSerial(sku);
    handleCheck(sku);
  };

  const renderResult = () => {
    if (loading) return <div className="text-center py-10 animate-pulse">Searching Database...</div>;
    if (scanned && !result) return (
      <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-lg font-medium">Serial Number Not Found</p>
        <p className="text-sm">Please check the serial number and try again.</p>
      </div>
    );

    if (!result) return null;

    const isActive = result.warranty_end_date ? new Date(result.warranty_end_date) >= new Date() : false;
    const daysRemaining = result.warranty_end_date ? differenceInDays(new Date(result.warranty_end_date), new Date()) : 0;
    const isSold = result.status === 'sold' || result.status === 'defective' || result.status === 'returned';

    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <Card className={`overflow-hidden border-2 ${isActive ? 'border-emerald-500/50 shadow-emerald-500/20 shadow-xl' : 'border-destructive/50 shadow-destructive/20 shadow-xl'}`}>
          <div className={`p-4 text-center ${isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
            {isActive ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-10 w-10" />
                <h3 className="text-xl font-bold uppercase tracking-wider">Warranty Active</h3>
                <p className="text-sm font-medium opacity-80">{daysRemaining} days remaining</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <AlertTriangle className="h-10 w-10" />
                <h3 className="text-xl font-bold uppercase tracking-wider">
                  {!isSold ? "Not Sold Yet" : result.warranty_end_date ? "Warranty Expired" : "No Warranty Provided"}
                </h3>
                {isSold && result.warranty_end_date && <p className="text-sm font-medium opacity-80">Expired {Math.abs(daysRemaining)} days ago</p>}
              </div>
            )}
          </div>
          
          <CardContent className="p-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" /> Product Details
              </h4>
              <div className="bg-muted/50 p-4 rounded-xl space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-semibold">{result.products?.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Serial Number</p>
                    <p className="font-mono text-sm">{result.serial_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="text-sm">{result.products?.category} / {result.products?.brand}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" /> Sale Details
              </h4>
              <div className="bg-muted/50 p-4 rounded-xl space-y-3">
                {!isSold ? (
                  <p className="text-sm text-muted-foreground italic">This product is currently in stock and has not been sold.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Sale Date</p>
                        <p className="text-sm font-medium">{result.sales?.sale_date ? format(new Date(result.sales.sale_date), "dd MMM yyyy") : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Warranty Until</p>
                        <p className="text-sm font-medium">{result.warranty_end_date ? format(new Date(result.warranty_end_date), "dd MMM yyyy") : "N/A"}</p>
                      </div>
                    </div>
                    {result.sales?.clients && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">Customer</p>
                        <p className="text-sm font-medium">{result.sales.clients.name}</p>
                        <p className="text-xs text-muted-foreground">{result.sales.clients.phone}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-2 border border-primary/20">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Warranty Check</h1>
        <p className="text-muted-foreground">Scan or enter a product serial number to verify warranty status</p>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Enter Serial Number..." 
                className="pl-10 h-12 text-lg"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              />
            </div>
            <Button onClick={() => setShowScanner(!showScanner)} variant={showScanner ? "destructive" : "secondary"} className="h-12 px-6">
              <Scan className="h-5 w-5 mr-2" /> {showScanner ? "Close Scanner" : "Scan"}
            </Button>
            <Button onClick={() => handleCheck()} className="h-12 px-8 font-semibold text-md">
              Verify
            </Button>
          </div>

          {showScanner && (
            <div className="mt-4 p-4 border rounded-xl bg-black/5">
              <BarcodeScanner onBarcodeDetected={handleBarcodeDetected} />
            </div>
          )}
        </CardContent>
      </Card>

      {renderResult()}
    </div>
  );
}
