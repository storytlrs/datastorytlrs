-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view reports in their spaces" ON public.reports;

-- Create updated policy that restricts draft reports to admin/analyst only
CREATE POLICY "Users can view reports in their spaces" 
ON public.reports 
FOR SELECT 
USING (
  -- Admins can view all reports
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Analysts can view all reports in their spaces
  (
    has_role(auth.uid(), 'analyst'::app_role)
    AND EXISTS (
      SELECT 1 FROM space_users
      WHERE (space_users.space_id = reports.space_id 
        OR space_users.space_id = (SELECT p.space_id FROM projects p WHERE p.id = reports.project_id))
      AND space_users.user_id = auth.uid()
    )
  )
  OR
  -- Clients can only view published (active) or archived reports in their spaces
  (
    has_role(auth.uid(), 'client'::app_role)
    AND reports.status IN ('active', 'archived')
    AND EXISTS (
      SELECT 1 FROM space_users
      WHERE (space_users.space_id = reports.space_id 
        OR space_users.space_id = (SELECT p.space_id FROM projects p WHERE p.id = reports.project_id))
      AND space_users.user_id = auth.uid()
    )
  )
);