-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for performance
CREATE INDEX idx_projects_space_id ON public.projects(space_id);

-- Updated_at trigger
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add project_id to reports table (nullable to support existing data)
ALTER TABLE public.reports ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX idx_reports_project_id ON public.reports(project_id);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Users can view projects in spaces they belong to
CREATE POLICY "Users can view projects in their spaces"
ON public.projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.space_users
    WHERE space_users.space_id = projects.space_id
    AND space_users.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can manage projects
CREATE POLICY "Admins can manage projects"
ON public.projects FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Update reports RLS policy to support project_id
DROP POLICY IF EXISTS "Users can view reports in their spaces" ON public.reports;

CREATE POLICY "Users can view reports in their spaces"
ON public.reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.space_users
    WHERE (
      space_users.space_id = reports.space_id
      OR space_users.space_id = (
        SELECT p.space_id FROM public.projects p WHERE p.id = reports.project_id
      )
    )
    AND space_users.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);