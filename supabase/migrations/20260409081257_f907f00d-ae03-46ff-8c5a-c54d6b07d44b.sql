
CREATE TABLE public.ai_chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  customer_name text,
  customer_phone text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert chat sessions" ON public.ai_chat_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update chat sessions" ON public.ai_chat_sessions FOR UPDATE TO anon USING (true);
CREATE POLICY "Authenticated can insert chat sessions" ON public.ai_chat_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update chat sessions" ON public.ai_chat_sessions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can view chat sessions" ON public.ai_chat_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can delete chat sessions" ON public.ai_chat_sessions FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_ai_chat_sessions_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_sessions;
