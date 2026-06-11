-- Add payment tracking fields to invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
