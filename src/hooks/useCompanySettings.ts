import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanySettings {
  id?: string;
  company_name: string;
  company_tagline: string;
  address: string;
  phone: string;
  email: string;
  default_tax_rate: number;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_branch: string;
  mobile_banking: string;
  footer_text: string;
  show_payment_info: boolean;
  logo_url: string;
  whatsapp_number: string;
}

const defaults: CompanySettings = {
  company_name: "AK IT Solution",
  company_tagline: "CCTV | Attendance Devices | IT Services",
  address: "Suvastu Arcade (ICT Bhaban), Lift-6, Shop-44, 45, 74/3, S,C,C Road, Mohottuli, Dhaka",
  phone: "01919-060590, 01762-060590",
  email: "akitsolution77@gmail.com",
  default_tax_rate: 0,
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  bank_branch: "",
  mobile_banking: "",
  footer_text: "Thank you for your business!",
  show_payment_info: true,
  logo_url: "",
  whatsapp_number: "",
};

export function useCompanySettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return defaults;
      const { data } = await supabase
        .from("company_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return defaults;
      return data as unknown as CompanySettings;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (settings: CompanySettings) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload = { ...settings, user_id: user.id };
      delete (payload as any).id;
      delete (payload as any).created_at;
      delete (payload as any).updated_at;
      const { error } = await (supabase.from("company_settings" as any) as any).upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-settings"] }),
  });

  return { settings: query.data || defaults, isLoading: query.isLoading, save: saveMutation };
}
