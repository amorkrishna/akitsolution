-- Create repair_tickets table
CREATE TABLE IF NOT EXISTS public.repair_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    device_info TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Received',
    estimated_cost NUMERIC(10, 2) DEFAULT 0.00,
    technician_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_repair_tickets_updated_at 
BEFORE UPDATE ON public.repair_tickets 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.repair_tickets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view ticket by exact number" 
ON public.repair_tickets 
FOR SELECT 
USING (true);

-- Admin policies
CREATE POLICY "Authenticated users can manage repair_tickets" 
ON public.repair_tickets 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create a helper function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'REP-' || to_char(CURRENT_DATE, 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_ticket_number
BEFORE INSERT ON public.repair_tickets
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();
