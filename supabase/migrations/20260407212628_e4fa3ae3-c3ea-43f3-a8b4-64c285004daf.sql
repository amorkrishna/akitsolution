
-- Create portfolio_projects table
CREATE TABLE public.portfolio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'CCTV',
  image_url text,
  client_name text,
  location text,
  completed_date date,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

-- Public can read
CREATE POLICY "Anyone can view portfolio projects" ON public.portfolio_projects
  FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can view portfolio projects" ON public.portfolio_projects
  FOR SELECT TO authenticated USING (true);

-- Authenticated CRUD
CREATE POLICY "Authenticated can insert portfolio projects" ON public.portfolio_projects
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update portfolio projects" ON public.portfolio_projects
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete portfolio projects" ON public.portfolio_projects
  FOR DELETE TO authenticated USING (true);

-- Updated_at trigger
CREATE TRIGGER update_portfolio_projects_updated_at
  BEFORE UPDATE ON public.portfolio_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for portfolio images
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-images', 'portfolio-images', true);

-- Storage RLS
CREATE POLICY "Anyone can view portfolio images" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'portfolio-images');

CREATE POLICY "Authenticated can upload portfolio images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portfolio-images');

CREATE POLICY "Authenticated can update portfolio images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'portfolio-images');

CREATE POLICY "Authenticated can delete portfolio images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'portfolio-images');
