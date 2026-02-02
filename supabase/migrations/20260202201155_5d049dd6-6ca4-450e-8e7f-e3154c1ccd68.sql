-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view space assignments" ON public.space_users;

-- Create a restricted policy that only allows:
-- 1. Users to see their own space assignments
-- 2. Admins to see all assignments (needed for user management)
CREATE POLICY "Users can view own space assignments or admins view all"
  ON public.space_users FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );