-- Add warranty tracking columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 0;
ALTER TABLE public.product_serials ADD COLUMN IF NOT EXISTS warranty_end_date TIMESTAMP WITH TIME ZONE;
