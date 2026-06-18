-- 1. Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    opening_balance NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at 
BEFORE UPDATE ON public.suppliers 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Policies for suppliers
CREATE POLICY "Authenticated users can manage suppliers" 
ON public.suppliers 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 2. Add supplier_id to purchases
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT;

-- 3. Data Migration: Create suppliers for existing purchases
INSERT INTO public.suppliers (name)
SELECT DISTINCT supplier_name
FROM public.purchases
WHERE supplier_name IS NOT NULL
  AND supplier_name NOT IN (SELECT name FROM public.suppliers);

-- 4. Update existing purchases with supplier_id
UPDATE public.purchases p
SET supplier_id = s.id
FROM public.suppliers s
WHERE p.supplier_name = s.name AND p.supplier_id IS NULL;

-- 5. Make supplier_name nullable in purchases (optional, to transition smoothly)
ALTER TABLE public.purchases ALTER COLUMN supplier_name DROP NOT NULL;

-- Note: In the frontend, we will now insert supplier_id instead of supplier_name,
-- but we might still insert supplier_name as a fallback just in case for older UI elements.

-- 6. Supplier Payments table (Optional: if they make a payment to a supplier without tying it to a specific purchase)
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'cash',
    reference_note TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage supplier_payments" ON public.supplier_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
