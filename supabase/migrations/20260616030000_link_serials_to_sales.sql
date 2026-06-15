-- Link product_serials to sales and invoices
ALTER TABLE public.product_serials ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL;
ALTER TABLE public.product_serials ADD COLUMN IF NOT EXISTS invoice_item_id UUID REFERENCES public.invoice_items(id) ON DELETE SET NULL;
