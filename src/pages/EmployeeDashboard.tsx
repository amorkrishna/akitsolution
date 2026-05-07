import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, ShoppingCart, LogOut } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";
import { DeleteAccountCard } from "@/components/DeleteAccountCard";

export default function EmployeeDashboard() {
  const navigate = useNavigate();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await supabase.from("projects").select("*, clients(name)")).data || [],
  });

  const { data: orders } = useQuery({
    queryKey: ["store-orders"],
    queryFn: async () => (await supabase.from("store_orders").select("*")).data || [],
  });

  const activeProjects = projects?.filter(p => p.status === "in_progress").length || 0;
  const pendingOrders = orders?.filter(o => o.status === "pending").length || 0;

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    in_progress: "bg-info/10 text-info border-info/20",
    completed: "bg-success/10 text-success border-success/20",
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Employee Dashboard</h1>
            <p className="text-muted-foreground text-sm">View-only access to projects and orders</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard title="Active Projects" value={activeProjects} icon={FolderKanban} />
          <StatCard title="Pending Orders" value={pendingOrders} icon={ShoppingCart} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Projects</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {projects?.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{(p as any).clients?.name || "No client"}</p>
                  </div>
                  <Badge variant="outline" className={statusColor[p.status] || ""}>{p.status}</Badge>
                </div>
              ))}
              {(!projects || projects.length === 0) && <p className="text-sm text-muted-foreground">No projects yet</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {orders?.slice(0, 10).map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{o.item_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_name}</p>
                  </div>
                  <Badge variant="outline" className={statusColor[o.status] || ""}>{o.status}</Badge>
                </div>
              ))}
              {(!orders || orders.length === 0) && <p className="text-sm text-muted-foreground">No orders yet</p>}
            </CardContent>
          </Card>
        </div>

        <ChangePasswordCard />
        <DeleteAccountCard />
      </div>
    </div>
  );
}
