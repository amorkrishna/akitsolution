
-- Allow anon to view services publicly for the store
CREATE POLICY "Anyone can view services publicly"
ON public.services FOR SELECT TO anon
USING (true);
