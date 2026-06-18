import {
  LayoutDashboard, Users, FolderKanban, Package, FileText, Wrench, Settings, ShieldCheck, ShoppingCart, Store, Receipt, Hammer, MessageSquareQuote, Globe, Warehouse, UserPlus, ClipboardList, Briefcase, Sparkles, CalendarDays, Paintbrush, FileBarChart, Clock, BarChart3, Megaphone, Ticket
} from "lucide-react";

export const mainItems = [
  { title: "nav.dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "nav.clients", url: "/clients", icon: Users },
  { title: "nav.leads", url: "/leads", icon: UserPlus },
  { title: "nav.products", url: "/products", icon: Package },
  { title: "nav.product_finder", url: "/product-finder", icon: Globe, adminOnly: true },
  { title: "nav.purchases", url: "/purchases", icon: ShoppingCart },
  { title: "nav.orders", url: "/orders", icon: ShoppingCart, badgeKey: "orders" as const },
  { title: "nav.inventory", url: "/inventory", icon: Warehouse },
];

export const financeItems = [
  { title: "nav.revenue", url: "/revenue", icon: BarChart3, revenueOnly: true },
  { title: "nav.reports", url: "/reports", icon: FileBarChart, revenueOnly: true },
  { title: "nav.quotations", url: "/quotations", icon: FileText },
  { title: "nav.invoices", url: "/invoices", icon: FileText },
  { title: "nav.expenses", url: "/expenses", icon: Receipt, revenueOnly: true },
];

export const serviceItems = [
  { title: "nav.service_requests", url: "/service-requests", icon: ClipboardList, badgeKey: "serviceReqs" as const },
  { title: "nav.packages", url: "/projects", icon: FolderKanban },
  { title: "nav.services", url: "/services", icon: Wrench },
  { title: "nav.servicing", url: "/servicing", icon: Hammer },
  { title: "Warranty Check", url: "/warranty-check", icon: ShieldCheck },
  { title: "nav.reviews", url: "/reviews", icon: MessageSquareQuote },
  { title: "nav.portfolio", url: "/portfolio", icon: FolderKanban },
];

export const marketingItems = [
  { title: "nav.marketing", url: "/marketing", icon: Megaphone },
  { title: "nav.promo", url: "/promo", icon: Ticket },
  { title: "nav.tenders", url: "/tenders", icon: Briefcase },
  { title: "nav.ai_chats", url: "/ai-chats", icon: Sparkles },
  { title: "nav.today", url: "/today", icon: CalendarDays },
];

export const hrItems = [
  { title: "nav.employees", url: "/employees", icon: Users },
  { title: "nav.attendance", url: "/attendance", icon: Clock },
];

export const adminItems = [
  { title: "nav.user_management", url: "/users", icon: ShieldCheck, adminOnly: true },
  { title: "nav.store_customize", url: "/store-settings", icon: Paintbrush, adminOnly: true },
  { title: "nav.online_store", url: "/", icon: Store, external: true },
  { title: "nav.settings", url: "/settings", icon: Settings, adminOnly: true },
];

export const allGroups = [
  { label: "sidebar.overview", items: mainItems },
  { label: "sidebar.finance", items: financeItems },
  { label: "sidebar.operations", items: serviceItems },
  { label: "sidebar.hr", items: hrItems },
  { label: "sidebar.marketing", items: marketingItems },
  { label: "sidebar.system", items: adminItems },
];
