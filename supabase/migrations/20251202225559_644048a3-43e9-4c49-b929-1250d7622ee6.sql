-- Drop existing INSERT policy for reports
DROP POLICY IF EXISTS "Admins can create reports" ON reports;

-- Create new policy allowing both admins and analysts to create reports
CREATE POLICY "Admins and analysts can create reports" 
ON reports
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'analyst'::app_role)
);