
-- Employee Attendance Table
CREATE TABLE public.employee_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in time WITHOUT TIME ZONE,
  check_out time WITHOUT TIME ZONE,
  status text NOT NULL DEFAULT 'present',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view attendance" ON public.employee_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert attendance" ON public.employee_attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update attendance" ON public.employee_attendance FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete attendance" ON public.employee_attendance FOR DELETE TO authenticated USING (true);

-- Employee Salary Table
CREATE TABLE public.employee_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  deduction numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  salary_month integer NOT NULL,
  salary_year integer NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  paid_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, salary_month, salary_year)
);

ALTER TABLE public.employee_salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view salaries" ON public.employee_salaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert salaries" ON public.employee_salaries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update salaries" ON public.employee_salaries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete salaries" ON public.employee_salaries FOR DELETE TO authenticated USING (true);

-- Store customization settings
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  announcement_text text,
  announcement_active boolean NOT NULL DEFAULT false,
  hero_title text DEFAULT 'AK IT Solution',
  hero_subtitle text DEFAULT 'Service is our first priority',
  banner_images jsonb DEFAULT '[]'::jsonb,
  theme_primary_color text DEFAULT '#7c3aed',
  layout_style text DEFAULT 'grid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view store settings" ON public.store_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can view store settings" ON public.store_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own store settings" ON public.store_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own store settings" ON public.store_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
