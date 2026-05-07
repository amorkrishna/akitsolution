
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can view product images" ON public.product_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert product images" ON public.product_images FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update product images" ON public.product_images FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete product images" ON public.product_images FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
