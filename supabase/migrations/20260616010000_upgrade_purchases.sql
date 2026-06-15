-- 1. Create purchase_items table
DROP TABLE IF EXISTS public.purchase_items CASCADE;

CREATE TABLE public.purchase_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add paid_amount to purchases
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) DEFAULT 0 NOT NULL;

-- 3. Migrate existing data from purchases to purchase_items
INSERT INTO public.purchase_items (purchase_id, product_id, quantity, unit_price, total_price)
SELECT id, product_id, quantity, unit_cost, total_cost
FROM public.purchases
WHERE product_id IS NOT NULL;

-- 4. Drop columns from purchases
ALTER TABLE public.purchases DROP COLUMN IF EXISTS product_id;
ALTER TABLE public.purchases DROP COLUMN IF EXISTS quantity;
ALTER TABLE public.purchases DROP COLUMN IF EXISTS unit_cost;

-- 5. Enable RLS and Policies for purchase_items
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all authenticated users" ON public.purchase_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for all authenticated users" ON public.purchase_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for all authenticated users" ON public.purchase_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for all authenticated users" ON public.purchase_items FOR DELETE TO authenticated USING (true);
