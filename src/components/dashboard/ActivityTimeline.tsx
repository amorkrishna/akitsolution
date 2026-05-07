import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ShoppingCart, FileText, TrendingUp, UserPlus, Wrench } from "lucide-react";
import { format } from "date-fns";

interface ActivityTimelineProps {
  orders: any[];
  invoices: any[];
  sales: any[];
  leads: any[];
  serviceRequests: any[];
}

type ActivityItem = {
  id: string;
  icon: any;
  label: string;
  detail: string;
  time: Date;
  color: string;
};

export function ActivityTimeline({ orders, invoices, sales, leads, serviceRequests }: ActivityTimelineProps) {
  const activities: ActivityItem[] = [];

  orders?.slice(0, 3).forEach(o => {
    activities.push({
      id: `order-${o.id}`,
      icon: ShoppingCart,
      label: `New order: ${o.item_name}`,
      detail: `${o.customer_name} • ৳${(Number(o.item_price) * o.quantity).toLocaleString()}`,
      time: new Date(o.created_at),
      color: "text-blue-500 bg-blue-500/10",
    });
  });

  invoices?.slice(0, 2).forEach(inv => {
    activities.push({
      id: `inv-${inv.id}`,
      icon: FileText,
      label: `Invoice ${inv.invoice_number}`,
      detail: `${(inv as any).clients?.name || "—"} • ${inv.status}`,
      time: new Date(inv.created_at),
      color: "text-emerald-500 bg-emerald-500/10",
    });
  });

  sales?.slice(0, 2).forEach(s => {
    activities.push({
      id: `sale-${s.id}`,
      icon: TrendingUp,
      label: `Sale: ${(s as any).products?.name || "Product"}`,
      detail: `৳${Number(s.total).toLocaleString()} • ${s.payment_status}`,
      time: new Date(s.created_at),
      color: "text-amber-500 bg-amber-500/10",
    });
  });

  leads?.slice(0, 2).forEach(l => {
    activities.push({
      id: `lead-${l.id}`,
      icon: UserPlus,
      label: `New lead: ${l.name}`,
      detail: `${l.service_type} • ${l.source || "website"}`,
      time: new Date(l.created_at),
      color: "text-purple-500 bg-purple-500/10",
    });
  });

  serviceRequests?.slice(0, 2).forEach(sr => {
    activities.push({
      id: `sr-${sr.id}`,
      icon: Wrench,
      label: `Service: ${sr.customer_name}`,
      detail: `${sr.category} • ${sr.urgency}`,
      time: new Date(sr.created_at),
      color: "text-rose-500 bg-rose-500/10",
    });
  });

  // Sort by time descending
  activities.sort((a, b) => b.time.getTime() - a.time.getTime());

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {activities.slice(0, 8).map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activity.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{activity.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{activity.detail}</p>
                </div>
                <span className="text-[9px] text-muted-foreground flex-shrink-0 mt-0.5">
                  {format(activity.time, "dd MMM HH:mm")}
                </span>
              </div>
            );
          })}
          {activities.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
