
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view purchases" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update purchases" ON public.purchases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete purchases" ON public.purchases FOR DELETE TO authenticated USING (true);
