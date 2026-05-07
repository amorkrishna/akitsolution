
-- Create store_orders table
CREATE TABLE public.store_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  item_name TEXT NOT NULL,
  item_price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create store_messages table
CREATE TABLE public.store_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_messages ENABLE ROW LEVEL SECURITY;

-- Anon can insert orders and messages (from store)
CREATE POLICY "Anyone can place orders" ON public.store_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can send messages" ON public.store_messages FOR INSERT TO anon WITH CHECK (true);

-- Authenticated can view/manage orders
CREATE POLICY "Authenticated can view orders" ON public.store_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update orders" ON public.store_orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete orders" ON public.store_orders FOR DELETE TO authenticated USING (true);

-- Authenticated can view/manage messages
CREATE POLICY "Authenticated can view messages" ON public.store_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update messages" ON public.store_messages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete messages" ON public.store_messages FOR DELETE TO authenticated USING (true);

-- Drop service_tickets table
DROP TABLE IF EXISTS public.service_tickets;
