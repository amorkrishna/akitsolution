CREATE TABLE public.servicing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  client_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  amount NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.servicing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view servicing" ON public.servicing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert servicing" ON public.servicing FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update servicing" ON public.servicing FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete servicing" ON public.servicing FOR DELETE TO authenticated USING (true);