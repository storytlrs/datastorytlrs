-- Fix has_role function to use plpgsql for better RLS compatibility
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- Update handle_new_user to assign client role by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign client role by default (changed from analyst)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  RETURN NEW;
END;
$$;

-- Update RLS policies for spaces table - Admin only for management
DROP POLICY IF EXISTS "Admins and analysts can create spaces" ON public.spaces;
CREATE POLICY "Admins can create spaces" ON public.spaces
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins and analysts can update spaces" ON public.spaces;
CREATE POLICY "Admins can update spaces" ON public.spaces
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Update RLS policies for space_users table - Admin only
DROP POLICY IF EXISTS "Admins and analysts can manage space users" ON public.space_users;
CREATE POLICY "Admins can manage space users" ON public.space_users
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Update RLS policies for reports table - Admin only for management
DROP POLICY IF EXISTS "Admins and analysts can create reports" ON public.reports;
CREATE POLICY "Admins can create reports" ON public.reports
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins and analysts can update reports" ON public.reports;
CREATE POLICY "Admins can update reports" ON public.reports
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));