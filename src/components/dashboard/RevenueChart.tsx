import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

interface RevenueChartProps {
  sales: any[];
  invoices: any[];
}

export function RevenueChart({ sales, invoices }: RevenueChartProps) {
  // Generate last 7 days data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const daySales = sales?.filter(s => s.sale_date === dateStr).reduce((sum: number, s: any) => sum + Number(s.total), 0) || 0;
    const dayInvoices = invoices?.filter((inv: any) => inv.status === "paid" && format(new Date(inv.issue_date), "yyyy-MM-dd") === dateStr).reduce((sum: number, inv: any) => sum + Number(inv.total), 0) || 0;
    return {
      date: format(date, "dd MMM"),
      sales: daySales,
      invoices: dayInvoices,
      total: daySales + dayInvoices,
    };
  });

  const totalWeek = chartData.reduce((sum, d) => sum + d.total, 0);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Revenue (7 Days)
          </CardTitle>
          <span className="text-xs font-bold text-primary">৳{totalWeek.toLocaleString()}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                }}
                labelStyle={{ fontWeight: "bold", fontSize: "11px" }}
              />
              <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
