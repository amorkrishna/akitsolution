
ALTER TABLE public.user_roles ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- Auto-approve existing users
UPDATE public.user_roles SET is_approved = true;
