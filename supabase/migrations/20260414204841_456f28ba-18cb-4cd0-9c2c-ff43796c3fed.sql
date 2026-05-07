ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS custom_css text,
ADD COLUMN IF NOT EXISTS ga_tracking_id text;