-- Fix 1: Profiles table - restrict SELECT to own profile OR admins only
-- Current policy allows any authenticated user to view all profiles

DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;

CREATE POLICY "Users can view own profile or admins can view all" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated
  USING (
    auth.uid() = id 
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );


-- Fix 2: Promo codes table - restrict SELECT to admin and analyst roles only (exclude clients)
-- Current policy allows any space member to view revenue data

DROP POLICY IF EXISTS "Users can view promo codes in their spaces" ON public.promo_codes;

CREATE POLICY "Admins and analysts can view promo codes" 
  ON public.promo_codes 
  FOR SELECT 
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'analyst'::app_role)
  );