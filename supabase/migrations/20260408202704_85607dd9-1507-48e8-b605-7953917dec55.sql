
CREATE TABLE public.tenders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  source_url TEXT,
  deadline DATE,
  budget_estimate NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  documents_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tenders" ON public.tenders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tenders" ON public.tenders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update tenders" ON public.tenders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete tenders" ON public.tenders FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_tenders_updated_at BEFORE UPDATE ON public.tenders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.tenders;
