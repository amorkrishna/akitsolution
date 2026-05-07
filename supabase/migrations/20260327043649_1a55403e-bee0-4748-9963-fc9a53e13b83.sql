CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL DEFAULT 'AK IT Solution',
  company_tagline text DEFAULT 'CCTV | Attendance Devices | IT Services',
  address text DEFAULT 'Suvastu Arcade (ICT Bhaban), Lift-6, Shop-44, 45, 74/3, S,C,C Road, Mohottuli, Dhaka',
  phone text DEFAULT '01919-060590, 01762-060590',
  email text DEFAULT 'akitsolution77@gmail.com',
  default_tax_rate numeric NOT NULL DEFAULT 0,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_branch text,
  mobile_banking text,
  footer_text text DEFAULT 'Thank you for your business!',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.company_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.company_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.company_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);