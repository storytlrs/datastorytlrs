
-- Create space_ai_insights table
CREATE TABLE public.space_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  tiles jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(space_id)
);

-- Enable RLS
ALTER TABLE public.space_ai_insights ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage space ai insights"
ON public.space_ai_insights
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Analysts can manage insights for spaces they belong to
CREATE POLICY "Analysts can manage space ai insights"
ON public.space_ai_insights
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'analyst'::app_role)
  AND EXISTS (
    SELECT 1 FROM space_users
    WHERE space_users.space_id = space_ai_insights.space_id
    AND space_users.user_id = auth.uid()
  )
);

-- Space members can view insights
CREATE POLICY "Users can view space ai insights"
ON public.space_ai_insights
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM space_users
    WHERE space_users.space_id = space_ai_insights.space_id
    AND space_users.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_space_ai_insights_updated_at
BEFORE UPDATE ON public.space_ai_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
