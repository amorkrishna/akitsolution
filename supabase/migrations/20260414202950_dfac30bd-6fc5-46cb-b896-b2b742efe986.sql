ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS footer_text text,
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS youtube_url text,
ADD COLUMN IF NOT EXISTS tiktok_url text;