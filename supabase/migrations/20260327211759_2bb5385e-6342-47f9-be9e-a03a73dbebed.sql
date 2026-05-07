
CREATE OR REPLACE FUNCTION public.handle_new_user_employee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.employees (name, email, phone, role, designation, status)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1), 'New Employee'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    'Technician',
    'Employee',
    'active'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_employee
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_employee();
