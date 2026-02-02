-- Fix content-thumbnails storage policies to restrict to admins and analysts only
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete thumbnails" ON storage.objects;

-- Create role-restricted policies
CREATE POLICY "Admins and analysts can upload thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'content-thumbnails' AND 
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'analyst'::public.app_role))
);

CREATE POLICY "Admins and analysts can update thumbnails"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'content-thumbnails' AND 
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'analyst'::public.app_role))
);

CREATE POLICY "Admins and analysts can delete thumbnails"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'content-thumbnails' AND 
  (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'analyst'::public.app_role))
);