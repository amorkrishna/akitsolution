import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, LogOut, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

import { LanguageProvider } from "@/contexts/LanguageContext";

const Index = lazy(() => import('./pages/Index'));
const Auth = lazy(() => import('./pages/Auth'));
const Clients = lazy(() => import('./pages/Clients'));
const Projects = lazy(() => import('./pages/Projects'));
const Products = lazy(() => import('./pages/Products'));
const Invoices = lazy(() => import('./pages/Invoices'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'));
const Services = lazy(() => import('./pages/Services'));
const Orders = lazy(() => import('./pages/Orders'));
const Settings = lazy(() => import('./pages/Settings'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));
const Employees = lazy(() => import('./pages/Employees'));
const Attendance = lazy(() => import('./pages/Attendance'));
const StoreSettings = lazy(() => import('./pages/StoreSettings'));
const Revenue = lazy(() => import('./pages/Revenue'));
const Sales = lazy(() => import('./pages/Sales'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Quotations = lazy(() => import('./pages/Quotations'));
const CreateQuotation = lazy(() => import('./pages/CreateQuotation'));
const Purchases = lazy(() => import('./pages/Purchases'));
const Store = lazy(() => import('./pages/Store'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Servicing = lazy(() => import('./pages/Servicing'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const ProductFinder = lazy(() => import('./pages/ProductFinder'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Leads = lazy(() => import('./pages/Leads'));
const ServiceRequests = lazy(() => import('./pages/ServiceRequests'));
const Tenders = lazy(() => import('./pages/Tenders'));
const Reports = lazy(() => import('./pages/Reports'));
const Today = lazy(() => import('./pages/Today'));
const AIChats = lazy(() => import('./pages/AIChats'));
const Marketing = lazy(() => import('./pages/Marketing'));
const PromoGenerator = lazy(() => import('./pages/PromoGenerator'));
const PublicServices = lazy(() => import('./pages/PublicServices'));

const queryClient = new QueryClient();

function PendingApprovalScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="max-w-md w-full shadow-xl border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-xl">Account Pending Approval</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            Your account has been created but is waiting for admin approval. 
            You will be able to access the dashboard once an administrator approves your account.
          </p>
          <p className="text-muted-foreground text-xs">
            Please contact your administrator for access.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthGuard({ children, adminOnly = false, revenueOnly = false }: { children?: React.ReactNode; adminOnly?: boolean; revenueOnly?: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { role, loading: roleLoading, isEmployee, isApproved, canAccessRevenue } = useUserRole();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading || roleLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (!isApproved) return <PendingApprovalScreen />;
  if (adminOnly && isEmployee) return <Navigate to="/dashboard" replace />;
  if (revenueOnly && !canAccessRevenue) return <Navigate to="/dashboard" replace />;
  
  return <>{children || <Outlet />}</>;
}

function EmployeeGuard({ children }: { children?: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { loading: roleLoading, isApproved } = useUserRole();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading || roleLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (!isApproved) return <PendingApprovalScreen />;
  return <>{children || <Outlet />}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Store />} />
          <Route path="/our-services" element={<PublicServices />} />
          <Route path="/shop" element={<Navigate to="/" replace />} />
          <Route path="/store" element={<Navigate to="/" replace />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/employee-dashboard" element={<EmployeeGuard><EmployeeDashboard /></EmployeeGuard>} />

          {/* All dashboard pages share a single persistent DashboardLayout */}
          <Route element={<AuthGuard><DashboardLayout /></AuthGuard>}>
            <Route path="/dashboard" element={<Index />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/products" element={<Products />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/servicing" element={<Servicing />} />
            <Route path="/quotations/create" element={<CreateQuotation />} />
            <Route path="/quotations/edit/:id" element={<CreateQuotation />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/create" element={<CreateInvoice />} />
            <Route path="/invoices/edit/:id" element={<CreateInvoice />} />
            <Route path="/services" element={<Services />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/service-requests" element={<ServiceRequests />} />
            <Route path="/tenders" element={<Tenders />} />
            <Route path="/today" element={<Today />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/ai-chats" element={<AIChats />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/promo" element={<PromoGenerator />} />
          </Route>

          {/* Revenue-only routes */}
          <Route element={<AuthGuard revenueOnly><DashboardLayout /></AuthGuard>}>
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/revenue" element={<Revenue />} />
            <Route path="/reports" element={<Reports />} />
          </Route>

          {/* Admin-only routes */}
          <Route element={<AuthGuard adminOnly><DashboardLayout /></AuthGuard>}>
            <Route path="/product-finder" element={<ProductFinder />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/store-settings" element={<StoreSettings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
