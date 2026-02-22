
-- Add DELETE policy on data_imports for admins
CREATE POLICY "Admins can delete imports"
ON public.data_imports
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy on audit_log for admins
CREATE POLICY "Admins can delete audit logs"
ON public.audit_log
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
