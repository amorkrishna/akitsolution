import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Bell, ShoppingCart, MessageCircle, ClipboardList } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useEffect } from "react";
import { toast } from "sonner";

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const { settings } = useCompanySettings();

  const { data: pendingOrders } = useQuery({
    queryKey: ["header-pending-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("store_orders").select("id, item_name, customer_name, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: unreadMessages } = useQuery({
    queryKey: ["header-unread-messages"],
    queryFn: async () => {
      const { count } = await supabase.from("store_messages").select("*", { count: "exact", head: true }).eq("is_read", false);
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: pendingServiceRequests } = useQuery({
    queryKey: ["header-pending-service-reqs"],
    queryFn: async () => {
      const { data } = await supabase.from("service_requests").select("id, customer_name, category, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const totalNotifications = (pendingOrders?.length || 0) + (unreadMessages || 0) + (pendingServiceRequests?.length || 0);

  useEffect(() => {
    // Listen for new store orders in real-time
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'store_orders',
        },
        (payload) => {
          const newOrder = payload.new as any;
          toast.success("New Store Order!", {
            description: `${newOrder.customer_name} ordered ${newOrder.item_name} (Qty: ${newOrder.quantity})`,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <SidebarProvider>
      <div className="h-[100dvh] flex w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b border-border/60 bg-card/60 backdrop-blur-xl px-4 md:px-6 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <div className="hidden sm:block h-5 w-px bg-border/60" />
              <span className="hidden sm:block text-xs text-muted-foreground font-medium">
                {settings.company_name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <GlobalSearch />
              {/* Notification Bell with Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-9 w-9 relative">
                    <Bell className="h-4 w-4" />
                    {totalNotifications > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground flex items-center justify-center">
                        {totalNotifications > 9 ? "9+" : totalNotifications}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="p-3 border-b border-border">
                    <h4 className="text-sm font-semibold">Notifications</h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {pendingOrders && pendingOrders.length > 0 ? (
                      pendingOrders.map((order: any) => (
                        <button
                          key={order.id}
                          onClick={() => navigate("/orders")}
                          className="w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b border-border/30 last:border-0"
                        >
                          <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="h-3.5 w-3.5 text-warning" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{order.item_name}</p>
                            <p className="text-[10px] text-muted-foreground">{order.customer_name}</p>
                          </div>
                          <Badge variant="outline" className="text-[8px] bg-warning/10 text-warning border-warning/20">Pending</Badge>
                        </button>
                      ))
                    ) : null}
                    
                    {pendingServiceRequests && pendingServiceRequests.length > 0 && pendingServiceRequests.map((req: any) => (
                      <button
                        key={req.id}
                        onClick={() => navigate("/service-requests")}
                        className="w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b border-border/30 last:border-0"
                      >
                        <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                          <ClipboardList className="h-3.5 w-3.5 text-info" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">Service: {req.category}</p>
                          <p className="text-[10px] text-muted-foreground">{req.customer_name}</p>
                        </div>
                        <Badge variant="outline" className="text-[8px] bg-info/10 text-info border-info/20">Pending</Badge>
                      </button>
                    ))}

                    {(!pendingOrders || pendingOrders.length === 0) && (!pendingServiceRequests || pendingServiceRequests.length === 0) && (!unreadMessages || unreadMessages === 0) && (
                      <p className="text-xs text-muted-foreground text-center py-6">No new notifications</p>
                    )}
                    
                    {(unreadMessages || 0) > 0 && (
                      <button
                        onClick={() => navigate("/orders")}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">{unreadMessages} unread messages</p>
                          <p className="text-[10px] text-muted-foreground">From store visitors</p>
                        </div>
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="h-5 w-px bg-border/60" />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground gap-2 text-xs font-medium">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-auto">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
