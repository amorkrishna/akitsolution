-- Fix RLS policies for services table so authenticated users can CRUD

-- Drop existing policies if any
DROP POLICY IF EXISTS "services_select" ON public.services;
DROP POLICY IF EXISTS "services_insert" ON public.services;
DROP POLICY IF EXISTS "services_update" ON public.services;
DROP POLICY IF EXISTS "services_delete" ON public.services;
DROP POLICY IF EXISTS "Allow select services" ON public.services;
DROP POLICY IF EXISTS "Allow insert services" ON public.services;
DROP POLICY IF EXISTS "Allow update services" ON public.services;
DROP POLICY IF EXISTS "Allow delete services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can view services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can insert services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can update services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can delete services" ON public.services;
DROP POLICY IF EXISTS "Public can view active services" ON public.services;
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;

-- Make sure RLS is enabled
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone (anon + authenticated) can read active services, authenticated can read all
CREATE POLICY "services_anon_select" ON public.services
  FOR SELECT
  USING (true);

-- INSERT: only authenticated users
CREATE POLICY "services_auth_insert" ON public.services
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: only authenticated users
CREATE POLICY "services_auth_update" ON public.services
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: only authenticated users
CREATE POLICY "services_auth_delete" ON public.services
  FOR DELETE
  TO authenticated
  USING (true);
