
ALTER TABLE public.planner_layouts 
ADD COLUMN is_shared boolean NOT NULL DEFAULT false,
ADD COLUMN share_token text UNIQUE DEFAULT NULL;

CREATE POLICY "Anyone can view shared layouts"
ON public.planner_layouts
FOR SELECT
TO anon
USING (is_shared = true AND share_token IS NOT NULL);
