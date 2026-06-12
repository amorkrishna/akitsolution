import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CameraOff, Search, ScanBarcode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onBarcodeDetected: (sku: string) => void;
}

export function BarcodeScanner({ onBarcodeDetected }: BarcodeScannerProps) {
  const [manualSku, setManualSku] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;
      setCameraActive(true);
      setScanning(true);

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 100 } },
        (decodedText) => {
          onBarcodeDetected(decodedText);
          toast({ title: "Barcode scanned", description: `SKU: ${decodedText}` });
        },
        () => {/* no-op */}
      );
    } catch (err: any) {
      toast({ title: "Camera error", description: err?.message || "Could not access camera", variant: "destructive" });
      setCameraActive(false);
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {/* no-op */}
    }
    scannerRef.current = null;
    setCameraActive(false);
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(() => {/* no-op */});
      }
    };
  }, [scanning]);

  const handleManualSearch = () => {
    if (manualSku.trim()) {
      onBarcodeDetected(manualSku.trim());
      setManualSku("");
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ScanBarcode className="h-5 w-5" />
          Barcode Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manual SKU Input */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <Label>Enter SKU / Barcode</Label>
            <Input
              value={manualSku}
              onChange={(e) => setManualSku(e.target.value)}
              placeholder="Type or scan barcode..."
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleManualSearch())}
            />
          </div>
          <Button type="button" onClick={handleManualSearch} disabled={!manualSku.trim()}>
            <Search className="h-4 w-4 mr-1" /> Find
          </Button>
        </div>

        {/* Camera Toggle */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={cameraActive ? "destructive" : "outline"}
            onClick={cameraActive ? stopCamera : startCamera}
            className="w-full"
          >
            {cameraActive ? <CameraOff className="h-4 w-4 mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
            {cameraActive ? "Stop Camera" : "Scan with Camera"}
          </Button>
        </div>

        {/* Camera View */}
        <div
          id="barcode-reader"
          className={cameraActive ? "rounded-lg overflow-hidden border border-border" : "hidden"}
        />
      </CardContent>
    </Card>
  );
}
