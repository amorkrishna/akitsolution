
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public can read invoice PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can upload invoice PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can update invoice PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'invoices');
