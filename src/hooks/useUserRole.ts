import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "employee" | "ceo" | "manager" | "sales";

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole(null);
        setIsApproved(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role, is_approved")
        .eq("user_id", user.id)
        .single();

      setRole((data?.role as AppRole) || "employee");
      setIsApproved(data?.is_approved ?? false);
      setLoading(false);
    };

    fetchRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const isCeo = role === "ceo";
  const isManager = role === "manager";
  const isSales = role === "sales";

  return {
    role,
    loading,
    isCeo,
    isAdmin: role === "admin" || isCeo,
    isManager: isManager || role === "admin" || isCeo,
    isEmployee: role === "employee",
    isSales,
    canAccessRevenue: isCeo || role === "admin" || isSales,
    isApproved: isApproved === true || isCeo,
  };
}
