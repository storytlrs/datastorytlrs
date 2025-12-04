-- Create ad_creatives table for Ads Campaign reports
CREATE TABLE public.ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  thumbnail_url TEXT,
  url TEXT,
  ad_type TEXT, -- video, carousel, static, ugc
  platform platform_type NOT NULL,
  campaign_name TEXT,
  adset_name TEXT,
  spend NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  published_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create campaign_planning table for Ads/Always-on Planning sub-tab
CREATE TABLE public.campaign_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'ad', 'content', 'budget', 'objective'
  planned_value NUMERIC,
  actual_value NUMERIC,
  unit TEXT, -- 'pieces', 'spend', 'reach', 'impressions', etc.
  notes TEXT,
  currency TEXT DEFAULT 'CZK',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_planning ENABLE ROW LEVEL SECURITY;

-- RLS policies for ad_creatives
CREATE POLICY "Users can view ad creatives in their spaces"
ON public.ad_creatives
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM reports r
    JOIN space_users su ON r.space_id = su.space_id
    WHERE r.id = ad_creatives.report_id AND su.user_id = auth.uid()
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins and analysts can manage ad creatives"
ON public.ad_creatives
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

-- RLS policies for campaign_planning
CREATE POLICY "Users can view campaign planning in their spaces"
ON public.campaign_planning
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM reports r
    JOIN space_users su ON r.space_id = su.space_id
    WHERE r.id = campaign_planning.report_id AND su.user_id = auth.uid()
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins and analysts can manage campaign planning"
ON public.campaign_planning
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_ad_creatives_updated_at
BEFORE UPDATE ON public.ad_creatives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_planning_updated_at
BEFORE UPDATE ON public.campaign_planning
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();