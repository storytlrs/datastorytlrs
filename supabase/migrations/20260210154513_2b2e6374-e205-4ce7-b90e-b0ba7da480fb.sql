
-- TikTok Campaigns
CREATE TABLE public.tiktok_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  status TEXT,
  objective TEXT,
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  amount_spent NUMERIC DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  date_start DATE,
  date_stop DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(space_id, campaign_id)
);

ALTER TABLE public.tiktok_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and analysts can manage tiktok campaigns"
  ON public.tiktok_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Users can view tiktok campaigns in their spaces"
  ON public.tiktok_campaigns FOR SELECT
  USING (EXISTS (SELECT 1 FROM space_users WHERE space_users.space_id = tiktok_campaigns.space_id AND space_users.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tiktok_campaigns_updated_at
  BEFORE UPDATE ON public.tiktok_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TikTok Ad Groups
CREATE TABLE public.tiktok_ad_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  tiktok_campaign_id UUID NOT NULL REFERENCES public.tiktok_campaigns(id) ON DELETE CASCADE,
  adgroup_id TEXT NOT NULL,
  adgroup_name TEXT,
  status TEXT,
  amount_spent NUMERIC DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  thruplays INTEGER DEFAULT 0,
  thruplay_rate NUMERIC DEFAULT 0,
  cost_per_thruplay NUMERIC DEFAULT 0,
  video_3s_plays INTEGER DEFAULT 0,
  view_rate_3s NUMERIC DEFAULT 0,
  cost_per_3s_play NUMERIC DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  cpe NUMERIC DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  follows INTEGER DEFAULT 0,
  date_start DATE,
  date_stop DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(space_id, adgroup_id)
);

ALTER TABLE public.tiktok_ad_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and analysts can manage tiktok ad groups"
  ON public.tiktok_ad_groups FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Users can view tiktok ad groups in their spaces"
  ON public.tiktok_ad_groups FOR SELECT
  USING (EXISTS (SELECT 1 FROM space_users WHERE space_users.space_id = tiktok_ad_groups.space_id AND space_users.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tiktok_ad_groups_updated_at
  BEFORE UPDATE ON public.tiktok_ad_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TikTok Ads
CREATE TABLE public.tiktok_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  tiktok_ad_group_id UUID NOT NULL REFERENCES public.tiktok_ad_groups(id) ON DELETE CASCADE,
  ad_id TEXT NOT NULL,
  ad_name TEXT,
  status TEXT,
  thumbnail_url TEXT,
  amount_spent NUMERIC DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  thruplays INTEGER DEFAULT 0,
  thruplay_rate NUMERIC DEFAULT 0,
  cost_per_thruplay NUMERIC DEFAULT 0,
  video_3s_plays INTEGER DEFAULT 0,
  view_rate_3s NUMERIC DEFAULT 0,
  cost_per_3s_play NUMERIC DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  cpe NUMERIC DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  follows INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  date_start DATE,
  date_stop DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(space_id, ad_id)
);

ALTER TABLE public.tiktok_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and analysts can manage tiktok ads"
  ON public.tiktok_ads FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Users can view tiktok ads in their spaces"
  ON public.tiktok_ads FOR SELECT
  USING (EXISTS (SELECT 1 FROM space_users WHERE space_users.space_id = tiktok_ads.space_id AND space_users.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tiktok_ads_updated_at
  BEFORE UPDATE ON public.tiktok_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
