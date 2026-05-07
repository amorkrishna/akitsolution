
-- Create expenses table
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'General',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create sales table
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Sales RLS: all authenticated
CREATE POLICY "Authenticated can view sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sales" ON public.sales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete sales" ON public.sales FOR DELETE TO authenticated USING (true);

-- Expenses RLS: admin/ceo/sales only
CREATE POLICY "Revenue roles can view expenses" ON public.expenses FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'sales'::app_role)
);
CREATE POLICY "Revenue roles can insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'sales'::app_role)
);
CREATE POLICY "Revenue roles can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'sales'::app_role)
);
CREATE POLICY "Revenue roles can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role) OR has_role(auth.uid(), 'sales'::app_role)
);

-- Update has_role to include sales in hierarchy
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND (
      role = _role
      OR (role = 'ceo' AND _role IN ('admin', 'manager', 'employee', 'sales'))
      OR (role = 'admin' AND _role IN ('manager', 'employee', 'sales'))
      OR (role = 'manager' AND _role = 'employee')
    )
  )
$$;
