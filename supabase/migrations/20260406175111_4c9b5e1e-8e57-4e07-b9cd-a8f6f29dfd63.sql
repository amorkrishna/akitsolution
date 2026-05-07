CREATE POLICY "Anon can view orders by phone"
ON public.store_orders
FOR SELECT
TO anon
USING (true);