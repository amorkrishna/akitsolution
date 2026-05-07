
CREATE TABLE public.planner_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Layout',
  room_width NUMERIC NOT NULL DEFAULT 10,
  room_depth NUMERIC NOT NULL DEFAULT 8,
  room_height NUMERIC NOT NULL DEFAULT 3,
  objects JSONB NOT NULL DEFAULT '[]'::jsonb,
  measurements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.planner_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own layouts"
  ON public.planner_layouts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own layouts"
  ON public.planner_layouts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own layouts"
  ON public.planner_layouts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own layouts"
  ON public.planner_layouts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_planner_layouts_updated_at
  BEFORE UPDATE ON public.planner_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
