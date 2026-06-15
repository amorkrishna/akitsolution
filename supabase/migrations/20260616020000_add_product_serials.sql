-- 1. Create product_serials table
CREATE TABLE IF NOT EXISTS public.product_serials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
    serial_number TEXT NOT NULL,
    status TEXT DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'returned', 'defective')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(product_id, serial_number)
);

ALTER TABLE public.product_serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all authenticated users" ON public.product_serials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for all authenticated users" ON public.product_serials FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for all authenticated users" ON public.product_serials FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for all authenticated users" ON public.product_serials FOR DELETE TO authenticated USING (true);

-- 2. Add has_serial column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS has_serial BOOLEAN DEFAULT false NOT NULL;
