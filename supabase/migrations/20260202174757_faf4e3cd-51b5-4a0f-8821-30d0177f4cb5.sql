-- Fix 1: Update profiles table RLS policy to require authentication
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;

-- Create new policy that requires authentication
CREATE POLICY "Users can view own profile or admins can view all" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = id 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Fix 2: Update promo_codes table RLS policies to require authentication
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view promo codes in their spaces" ON public.promo_codes;

-- Create new policy that requires authentication
CREATE POLICY "Users can view promo codes in their spaces" 
ON public.promo_codes 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR EXISTS (
      SELECT 1
      FROM reports r
      JOIN space_users su ON r.space_id = su.space_id
      WHERE r.id = promo_codes.report_id 
      AND su.user_id = auth.uid()
    )
  )
);