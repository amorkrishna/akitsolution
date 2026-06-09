import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TopProductsChartProps {
  sales: any[];
}

export function TopProductsChart({ sales }: TopProductsChartProps) {
  // Calculate top products from sales
  const productQuantities: Record<string, number> = {};
  
  sales?.forEach(sale => {
    const productName = sale.products?.name || "Unknown Product";
    productQuantities[productName] = (productQuantities[productName] || 0) + Number(sale.quantity || 1);
  });

  const chartData = Object.entries(productQuantities)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5); // Top 5 products

  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--primary) / 0.8)",
    "hsl(var(--primary) / 0.6)",
    "hsl(var(--primary) / 0.4)",
    "hsl(var(--primary) / 0.2)",
  ];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> Top Products by Volume
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} className="text-muted-foreground" />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                  labelStyle={{ fontWeight: "bold", fontSize: "11px", color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-muted-foreground">No sales data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
