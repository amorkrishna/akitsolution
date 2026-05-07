
-- Fix: Allow authenticated users to also insert orders and messages from the store
CREATE POLICY "Authenticated can place orders"
ON public.store_orders FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can send messages"
ON public.store_messages FOR INSERT TO authenticated
WITH CHECK (true);
