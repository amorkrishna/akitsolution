import { Button } from "@/components/ui/button";
import { FileText, Package, ShoppingCart, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function WelcomeBanner() {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const emoji = hour < 12 ? "☀️" : hour < 17 ? "🌤️" : "🌙";

  const quickActions = [
    { label: "New Invoice", icon: FileText, path: "/invoices/create", color: "from-violet-600 to-indigo-600" },
    { label: "Add Product", icon: Package, path: "/products", color: "from-emerald-600 to-teal-600" },
    { label: "View Orders", icon: ShoppingCart, path: "/orders", color: "from-amber-600 to-orange-600" },
    { label: "New Quotation", icon: Plus, path: "/quotations/create", color: "from-purple-600 to-pink-600" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border border-primary/20 p-6 sm:p-8">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4" />
      <div className="relative">
        <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight">
          {emoji} {greeting}!
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your business today.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => navigate(action.path)}
              className="gap-1.5 text-xs h-8 rounded-lg bg-card/60 backdrop-blur-sm border-border/60 hover:bg-card hover:shadow-md transition-all"
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
