-- Fix default user role: new users should get 'client' role, not 'analyst'
-- The create-user edge function comment already assumes 'client' as default,
-- but the DB trigger was still assigning 'analyst', giving all new users
-- access to all spaces via the analyst RLS policies.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- Assign client role by default (analysts/admins are promoted manually)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');

  RETURN NEW;
END;
$$;
