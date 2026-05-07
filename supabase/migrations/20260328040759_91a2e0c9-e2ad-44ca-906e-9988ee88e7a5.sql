
-- Create quotations table
CREATE TABLE public.quotations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_number text NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create quotation_items table
CREATE TABLE public.quotation_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for quotations
CREATE POLICY "Authenticated can view quotations" ON public.quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update quotations" ON public.quotations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete quotations" ON public.quotations FOR DELETE TO authenticated USING (true);

-- RLS policies for quotation_items
CREATE POLICY "Authenticated can view quotation_items" ON public.quotation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert quotation_items" ON public.quotation_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update quotation_items" ON public.quotation_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete quotation_items" ON public.quotation_items FOR DELETE TO authenticated USING (true);

-- Updated_at trigger
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate quotation number function
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.quotations;
  RETURN 'QT-' || LPAD(next_num::TEXT, 5, '0');
END;
$$;
