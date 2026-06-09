import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, PackagePlus, UserPlus, FileText, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-20 flex flex-col gap-2 items-center justify-center bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
            onClick={() => navigate("/sales")}
          >
            <ShoppingCart className="h-6 w-6" />
            <span className="text-xs font-semibold">New Sale</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-20 flex flex-col gap-2 items-center justify-center bg-background hover:bg-success/5 hover:text-success hover:border-success/30 transition-all shadow-sm"
            onClick={() => navigate("/products")}
          >
            <PackagePlus className="h-6 w-6" />
            <span className="text-xs font-semibold">Add Product</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-20 flex flex-col gap-2 items-center justify-center bg-background hover:bg-info/5 hover:text-info hover:border-info/30 transition-all shadow-sm"
            onClick={() => navigate("/clients")}
          >
            <UserPlus className="h-6 w-6" />
            <span className="text-xs font-semibold">New Client</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-20 flex flex-col gap-2 items-center justify-center bg-background hover:bg-warning/5 hover:text-warning hover:border-warning/30 transition-all shadow-sm"
            onClick={() => navigate("/invoices")}
          >
            <FileText className="h-6 w-6" />
            <span className="text-xs font-semibold">Create Invoice</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
