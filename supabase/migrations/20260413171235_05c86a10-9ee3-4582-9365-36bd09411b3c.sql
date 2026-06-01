
-- Create tables only if they don't exist
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_time TIME,
  is_recurring BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.daily_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  color TEXT DEFAULT 'yellow',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '⭐',
  target_days TEXT[] DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun'],
  streak INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habit_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES public.daily_habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(habit_id, completed_date)
);

CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.daily_tasks(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all (idempotent)
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- Policies (drop if exist to be safe)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users manage own tasks" ON public.daily_tasks;
  DROP POLICY IF EXISTS "Users manage own notes" ON public.daily_notes;
  DROP POLICY IF EXISTS "Users manage own habits" ON public.daily_habits;
  DROP POLICY IF EXISTS "Users manage own completions" ON public.habit_completions;
  DROP POLICY IF EXISTS "Users manage own sessions" ON public.focus_sessions;
END $$;

CREATE POLICY "Users manage own tasks" ON public.daily_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own notes" ON public.daily_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own habits" ON public.daily_habits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own completions" ON public.habit_completions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own sessions" ON public.focus_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
