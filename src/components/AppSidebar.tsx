import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Users, FolderKanban, Package, FileText, Wrench, Settings, ShieldCheck, ShoppingCart, Store, Receipt, Hammer, MessageSquareQuote, ChevronRight, Globe, Warehouse, UserPlus, ClipboardList, Briefcase, Sparkles, CalendarDays, Search, X, Sun, Moon, BarChart3, Clock, Paintbrush, FileBarChart, Languages, Box,
} from "lucide-react";
import akLogoDefault from "@/assets/ak-logo.png";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const mainItems = [
  { title: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "nav.clients", url: "/clients", icon: Users },
  { title: "nav.leads", url: "/leads", icon: UserPlus },
  { title: "nav.products", url: "/products", icon: Package },
  { title: "nav.product_finder", url: "/product-finder", icon: Globe, adminOnly: true },
  { title: "nav.purchases", url: "/purchases", icon: ShoppingCart },
  { title: "nav.orders", url: "/orders", icon: ShoppingCart, badgeKey: "orders" as const },
  { title: "nav.inventory", url: "/inventory", icon: Warehouse },
];

const financeItems = [
  { title: "nav.revenue", url: "/revenue", icon: BarChart3, revenueOnly: true },
  { title: "nav.reports", url: "/reports", icon: FileBarChart, revenueOnly: true },
  { title: "nav.quotations", url: "/quotations", icon: FileText },
  { title: "nav.invoices", url: "/invoices", icon: FileText },
  { title: "nav.expenses", url: "/expenses", icon: Receipt, revenueOnly: true },
];

const serviceItems = [
  { title: "nav.service_requests", url: "/service-requests", icon: ClipboardList, badgeKey: "serviceReqs" as const },
  { title: "nav.packages", url: "/projects", icon: FolderKanban },
  { title: "nav.services", url: "/services", icon: Wrench },
  { title: "nav.servicing", url: "/servicing", icon: Hammer },
  { title: "nav.reviews", url: "/reviews", icon: MessageSquareQuote },
  { title: "nav.portfolio", url: "/portfolio", icon: FolderKanban },
];

const marketingItems = [
  { title: "nav.tenders", url: "/tenders", icon: Briefcase },
  { title: "nav.ai_chats", url: "/ai-chats", icon: Sparkles },
  { title: "nav.today", url: "/today", icon: CalendarDays },
];

const hrItems = [
  { title: "nav.employees", url: "/employees", icon: Users },
  { title: "nav.attendance", url: "/attendance", icon: Clock },
];

const adminItems = [
  { title: "nav.camera_planner_3d", url: "/camera-planner-3d", icon: Box, adminOnly: true },
  { title: "nav.user_management", url: "/users", icon: ShieldCheck, adminOnly: true },
  { title: "nav.store_customize", url: "/store-settings", icon: Paintbrush, adminOnly: true },
  { title: "nav.online_store", url: "/", icon: Store, external: true },
  { title: "nav.settings", url: "/settings", icon: Settings, adminOnly: true },
];

const allGroups = [
  { label: "sidebar.overview", items: mainItems },
  { label: "sidebar.finance", items: financeItems },
  { label: "sidebar.operations", items: serviceItems },
  { label: "sidebar.hr", items: hrItems },
  { label: "sidebar.marketing", items: marketingItems },
  { label: "sidebar.system", items: adminItems },
];

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 w-full rounded-lg transition-all text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ${
        collapsed ? "justify-center p-2" : "px-3 py-2"
      }`}
      title={isDark ? "Light Mode" : "Dark Mode"}
    >
      {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
      {!collapsed && <span className="text-xs font-medium">{isDark ? "Light Mode" : "Dark Mode"}</span>}
    </button>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { isAdmin, canAccessRevenue } = useUserRole();
  const { settings } = useCompanySettings();
  const { t, language, setLanguage } = useTranslation();
  const logoSrc = settings.logo_url || akLogoDefault;
  const [searchQuery, setSearchQuery] = useState("");

  const { data: pendingOrders } = useQuery({
    queryKey: ["sidebar-pending-orders"],
    queryFn: async () => {
      const { count } = await supabase.from("store_orders").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: pendingServiceReqs } = useQuery({
    queryKey: ["sidebar-pending-service-reqs"],
    queryFn: async () => {
      const { count } = await supabase.from("service_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const badgeCounts: Record<string, number> = {
    orders: pendingOrders || 0,
    serviceReqs: pendingServiceReqs || 0,
  };

  const filterByRole = (items: any[]) =>
    items.filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.revenueOnly && !canAccessRevenue) return false;
      return true;
    });

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allGroups.map(group => {
      const roleFiltered = filterByRole(group.items);
      if (!q) return { ...group, items: roleFiltered };
      return {
        ...group,
        items: roleFiltered.filter(item =>
          t(item.title).toLowerCase().includes(q) || item.url.toLowerCase().includes(q)
        ),
      };
    }).filter(g => g.items.length > 0);
  }, [searchQuery, isAdmin, canAccessRevenue, language]);

  const renderItem = (item: any) => {
    const isActive = location.pathname === item.url;
    const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;

    const linkContent = (
      <>
        <item.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px] flex-shrink-0" />
        {!collapsed && <span className="text-xs sm:text-[13px] font-medium flex-1">{t(item.title)}</span>}
        {!collapsed && item.external && <ChevronRight className="h-3 w-3 ml-auto opacity-40" />}
        {!collapsed && badgeCount > 0 && (
          <Badge variant="destructive" className="text-[8px] h-4 min-w-[16px] px-1 ml-auto">
            {badgeCount}
          </Badge>
        )}
        {collapsed && badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
        )}
      </>
    );

    const menuButton = (
      <SidebarMenuButton asChild isActive={isActive}>
        {item.external ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-sidebar-accent/60 ${isActive ? "border-l-2 border-sidebar-primary" : ""}`}>
            {linkContent}
          </a>
        ) : (
          <NavLink to={item.url} end className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-sidebar-accent/60 ${isActive ? "border-l-2 border-sidebar-primary" : ""}`} activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
            {linkContent}
          </NavLink>
        )}
      </SidebarMenuButton>
    );

    return (
      <SidebarMenuItem key={item.title}>
        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-medium">
                {t(item.title)}
                {badgeCount > 0 && <span className="ml-1.5 text-destructive font-bold">({badgeCount})</span>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : menuButton}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Brand Header */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-sidebar-border/50">
        <div className="relative flex-shrink-0">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-violet-500/30 to-indigo-500/30 rounded-xl blur-sm" />
          <img src={logoSrc} alt={settings.company_name} className="relative w-10 h-10 rounded-xl object-contain bg-sidebar-accent/50 p-0.5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-sidebar-accent-foreground truncate font-display tracking-tight">{settings.company_name}</h1>
            <p className="text-[9px] text-sidebar-foreground/50 truncate font-medium mt-0.5">{settings.company_tagline}</p>
          </div>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("common.search_pages")}
              className="h-8 pl-8 pr-7 text-xs bg-sidebar-accent/30 border-sidebar-border/40 focus:border-sidebar-primary/50 placeholder:text-sidebar-foreground/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <SidebarContent className="py-2 space-y-1">
        {filteredGroups.length === 0 && searchQuery ? (
          <div className="px-4 py-6 text-center">
            <Search className="h-6 w-6 mx-auto text-sidebar-foreground/20 mb-2" />
            <p className="text-[11px] text-sidebar-foreground/40">{t("common.no_pages_found")}</p>
          </div>
        ) : (
          filteredGroups.map(group => (
            <SidebarGroup key={group.label}>
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40 px-3 mb-1">
                  {t(group.label)}
                  {searchQuery && <span className="ml-1 text-sidebar-primary/60">({group.items.length})</span>}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(renderItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      {/* Footer with Theme & Language Toggle */}
      <div className={`border-t border-sidebar-border/50 ${collapsed ? "px-2 py-2 space-y-1" : "px-4 py-3 space-y-1"}`}>
        <ThemeToggle collapsed={collapsed} />
        <button
          onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
          className={`flex items-center gap-2 w-full rounded-lg transition-all text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ${
            collapsed ? "justify-center p-2" : "px-3 py-2"
          }`}
          title={language === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
        >
          <Languages className="h-4 w-4 text-primary" />
          {!collapsed && <span className="text-xs font-medium">{language === "bn" ? "English" : "বাংলা"}</span>}
        </button>
        {!collapsed && (
          <p className="text-[9px] text-sidebar-foreground/30 font-medium mt-2">© {new Date().getFullYear()} {settings.company_name}</p>
        )}
      </div>
    </Sidebar>
  );
}
