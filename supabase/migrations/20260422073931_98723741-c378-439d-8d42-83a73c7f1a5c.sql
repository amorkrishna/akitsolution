
-- Category tiles table for storefront home-page category cards
CREATE TABLE public.category_tiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  image_url text,
  link_url text NOT NULL DEFAULT '/',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.category_tiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active category tiles"
  ON public.category_tiles FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated can view all category tiles"
  ON public.category_tiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert category tiles"
  ON public.category_tiles FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update category tiles"
  ON public.category_tiles FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated can delete category tiles"
  ON public.category_tiles FOR DELETE TO authenticated
  USING (true);

CREATE TRIGGER trg_category_tiles_updated_at
  BEFORE UPDATE ON public.category_tiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 3 default tiles
INSERT INTO public.category_tiles (slug, title, subtitle, link_url, sort_order) VALUES
  ('cctv',       'CCTV Cameras',      'HD/4K surveillance solutions',         '/?cat=CCTV',                 1),
  ('attendance', 'Attendance Devices','Biometric & RFID time tracking',       '/?cat=Attendance%20Device',  2),
  ('servicing',  'Service & Repair',  'Installation, maintenance & repair',   '/?section=services',         3);

-- Public storage bucket for storefront images (tiles + service photos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('storefront-images', 'storefront-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view storefront images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'storefront-images');

CREATE POLICY "Authenticated can upload storefront images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'storefront-images');

CREATE POLICY "Authenticated can update storefront images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'storefront-images');

CREATE POLICY "Authenticated can delete storefront images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'storefront-images');
