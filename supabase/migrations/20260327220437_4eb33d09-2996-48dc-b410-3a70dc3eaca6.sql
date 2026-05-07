
-- Insert missing user_roles for users who have profiles but no role entry
INSERT INTO public.user_roles (user_id, role, is_approved)
SELECT p.id, 'employee', false
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.id IS NULL;
