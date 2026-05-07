
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_label text NOT NULL,
  variant_group text NOT NULL DEFAULT 'Size',
  price numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  sku text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view variants publicly" ON public.product_variants FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can view variants" ON public.product_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert variants" ON public.product_variants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update variants" ON public.product_variants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete variants" ON public.product_variants FOR DELETE TO authenticated USING (true);
