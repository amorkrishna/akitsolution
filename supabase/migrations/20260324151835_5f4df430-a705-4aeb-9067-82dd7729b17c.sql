
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'CCTV',
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert services" ON public.services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update services" ON public.services FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone can delete services" ON public.services FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
