
-- Junction table to link reports to brand campaigns
CREATE TABLE public.report_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  brand_campaign_id UUID NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, brand_campaign_id)
);

ALTER TABLE public.report_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and analysts can manage report campaigns"
ON public.report_campaigns FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Users can view report campaigns in their spaces"
ON public.report_campaigns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reports r
    JOIN space_users su ON r.space_id = su.space_id
    WHERE r.id = report_campaigns.report_id AND su.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
