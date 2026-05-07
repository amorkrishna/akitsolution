
-- Add 'manager' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- Add designation column to user_roles for title tracking
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS designation text DEFAULT 'Employee';
