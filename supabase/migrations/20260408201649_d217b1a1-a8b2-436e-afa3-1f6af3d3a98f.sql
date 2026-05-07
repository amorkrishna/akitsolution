
-- Leads table for CRM
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  service_type text NOT NULL DEFAULT 'General',
  message text,
  status text NOT NULL DEFAULT 'new',
  follow_up_date date,
  notes text,
  source text DEFAULT 'website',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit leads" ON public.leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can submit leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can view leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete leads" ON public.leads FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Service Requests table
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text,
  email text,
  category text NOT NULL DEFAULT 'Other',
  description text NOT NULL,
  preferred_date date,
  urgency text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit service requests" ON public.service_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can submit service requests" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can view service requests" ON public.service_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update service requests" ON public.service_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete service requests" ON public.service_requests FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
