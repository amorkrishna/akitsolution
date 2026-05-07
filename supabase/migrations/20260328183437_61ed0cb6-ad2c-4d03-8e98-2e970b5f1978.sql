
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS cash_discount_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_in_store boolean NOT NULL DEFAULT true;
