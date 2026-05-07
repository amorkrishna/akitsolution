
INSERT INTO storage.buckets (id, name, public) VALUES ('package-images', 'package-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view package images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'package-images');
CREATE POLICY "Authenticated can upload package images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'package-images');
CREATE POLICY "Authenticated can update package images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'package-images');
CREATE POLICY "Authenticated can delete package images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'package-images');
