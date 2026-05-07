
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS included_items jsonb DEFAULT '[]'::jsonb;
