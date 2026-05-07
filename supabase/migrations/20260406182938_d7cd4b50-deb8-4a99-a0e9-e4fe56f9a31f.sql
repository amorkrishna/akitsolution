
CREATE TABLE public.customer_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_name TEXT NOT NULL,
  reviewer_role TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous store visitors) can view published reviews
CREATE POLICY "Anyone can view published reviews"
  ON public.customer_reviews FOR SELECT
  TO anon
  USING (is_published = true);

CREATE POLICY "Authenticated can view all reviews"
  ON public.customer_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert reviews"
  ON public.customer_reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update reviews"
  ON public.customer_reviews FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can delete reviews"
  ON public.customer_reviews FOR DELETE
  TO authenticated
  USING (true);
