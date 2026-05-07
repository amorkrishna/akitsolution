
-- Marketing settings for social media links
CREATE TABLE public.marketing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  facebook_page_url TEXT,
  instagram_handle TEXT,
  twitter_handle TEXT,
  whatsapp_number TEXT,
  website_url TEXT,
  google_business_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own marketing settings" ON public.marketing_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own marketing settings" ON public.marketing_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own marketing settings" ON public.marketing_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Marketing posts for saved generated content
CREATE TABLE public.marketing_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL DEFAULT 'facebook',
  campaign_type TEXT NOT NULL DEFAULT 'product_launch',
  content TEXT NOT NULL,
  image_url TEXT,
  product_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own marketing posts" ON public.marketing_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own marketing posts" ON public.marketing_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own marketing posts" ON public.marketing_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own marketing posts" ON public.marketing_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_marketing_settings_updated_at BEFORE UPDATE ON public.marketing_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_posts_updated_at BEFORE UPDATE ON public.marketing_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
