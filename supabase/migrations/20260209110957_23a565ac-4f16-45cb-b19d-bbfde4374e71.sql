
-- Brand-level campaigns from Meta
CREATE TABLE public.brand_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  campaign_id text NOT NULL,
  campaign_name text,
  status text,
  objective text,
  daily_budget numeric,
  lifetime_budget numeric,
  amount_spent numeric DEFAULT 0,
  reach integer DEFAULT 0,
  impressions integer DEFAULT 0,
  frequency numeric DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  clicks integer DEFAULT 0,
  date_start date,
  date_stop date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(space_id, campaign_id)
);

-- Brand-level ad sets from Meta
CREATE TABLE public.brand_ad_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  brand_campaign_id uuid NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
  adset_id text NOT NULL,
  adset_name text,
  status text,
  amount_spent numeric DEFAULT 0,
  reach integer DEFAULT 0,
  impressions integer DEFAULT 0,
  frequency numeric DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  clicks integer DEFAULT 0,
  thruplays integer DEFAULT 0,
  thruplay_rate numeric DEFAULT 0,
  cost_per_thruplay numeric DEFAULT 0,
  video_3s_plays integer DEFAULT 0,
  view_rate_3s numeric DEFAULT 0,
  cost_per_3s_play numeric DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  cpe numeric DEFAULT 0,
  date_start date,
  date_stop date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(space_id, adset_id)
);

-- Brand-level ads from Meta
CREATE TABLE public.brand_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  brand_ad_set_id uuid NOT NULL REFERENCES public.brand_ad_sets(id) ON DELETE CASCADE,
  ad_id text NOT NULL,
  ad_name text,
  status text,
  amount_spent numeric DEFAULT 0,
  reach integer DEFAULT 0,
  impressions integer DEFAULT 0,
  frequency numeric DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  clicks integer DEFAULT 0,
  thruplays integer DEFAULT 0,
  thruplay_rate numeric DEFAULT 0,
  cost_per_thruplay numeric DEFAULT 0,
  video_3s_plays integer DEFAULT 0,
  view_rate_3s numeric DEFAULT 0,
  cost_per_3s_play numeric DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  cpe numeric DEFAULT 0,
  post_reactions integer DEFAULT 0,
  post_comments integer DEFAULT 0,
  post_shares integer DEFAULT 0,
  post_saves integer DEFAULT 0,
  link_clicks integer DEFAULT 0,
  date_start date,
  date_stop date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(space_id, ad_id)
);

-- Enable RLS
ALTER TABLE public.brand_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_ads ENABLE ROW LEVEL SECURITY;

-- RLS: Admins and analysts can manage
CREATE POLICY "Admins and analysts can manage brand campaigns"
  ON public.brand_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Users can view brand campaigns in their spaces"
  ON public.brand_campaigns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM space_users WHERE space_users.space_id = brand_campaigns.space_id AND space_users.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and analysts can manage brand ad sets"
  ON public.brand_ad_sets FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Users can view brand ad sets in their spaces"
  ON public.brand_ad_sets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM space_users WHERE space_users.space_id = brand_ad_sets.space_id AND space_users.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and analysts can manage brand ads"
  ON public.brand_ads FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Users can view brand ads in their spaces"
  ON public.brand_ads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM space_users WHERE space_users.space_id = brand_ads.space_id AND space_users.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_brand_campaigns_space_id ON public.brand_campaigns(space_id);
CREATE INDEX idx_brand_ad_sets_space_id ON public.brand_ad_sets(space_id);
CREATE INDEX idx_brand_ad_sets_campaign_id ON public.brand_ad_sets(brand_campaign_id);
CREATE INDEX idx_brand_ads_space_id ON public.brand_ads(space_id);
CREATE INDEX idx_brand_ads_ad_set_id ON public.brand_ads(brand_ad_set_id);

-- Update triggers
CREATE TRIGGER update_brand_campaigns_updated_at
  BEFORE UPDATE ON public.brand_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brand_ad_sets_updated_at
  BEFORE UPDATE ON public.brand_ad_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brand_ads_updated_at
  BEFORE UPDATE ON public.brand_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
