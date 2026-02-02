-- Fix security issue: profiles table should not be publicly readable
-- Users should only be able to view their own profile, admins can view all

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive SELECT policy
-- Users can view their own profile, admins can view all profiles
CREATE POLICY "Users can view own profile or admins can view all" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));

-- Fix security issue: user_roles table should not be publicly readable
-- Users should only be able to view their own role, admins can view all

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

-- Create a more restrictive SELECT policy
-- Users can view their own role, admins can view all roles
CREATE POLICY "Users can view own role or admins can view all" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));