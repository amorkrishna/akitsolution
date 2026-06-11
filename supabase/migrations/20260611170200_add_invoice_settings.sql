-- Add signature URL and terms and conditions to company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS terms_conditions TEXT DEFAULT 'Goods once sold cannot be returned. 1 Year Warranty on specified items.';
