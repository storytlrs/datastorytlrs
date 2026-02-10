
-- TikTok Ad Demographic Breakdowns (age, gender, location per ad)
CREATE TABLE public.tiktok_ad_demographics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  tiktok_campaign_id UUID REFERENCES public.tiktok_campaigns(id) ON DELETE CASCADE,
  tiktok_ad_group_id UUID REFERENCES public.tiktok_ad_groups(id) ON DELETE CASCADE,
  tiktok_ad_id UUID REFERENCES public.tiktok_ads(id) ON DELETE CASCADE,
  campaign_id TEXT,
  adgroup_id TEXT,
  ad_id TEXT,
  age TEXT,
  gender TEXT,
  location TEXT,
  amount_spent NUMERIC DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  video_view_rate NUMERIC DEFAULT 0,
  video_watched_2s INTEGER DEFAULT 0,
  video_watched_6s INTEGER DEFAULT 0,
  video_views_p25 INTEGER DEFAULT 0,
  video_views_p50 INTEGER DEFAULT 0,
  video_views_p100 INTEGER DEFAULT 0,
  average_play_time_per_user NUMERIC DEFAULT 0,
  average_play_time_per_view NUMERIC DEFAULT 0,
  cost_per_engagement NUMERIC DEFAULT 0,
  paid_likes INTEGER DEFAULT 0,
  paid_comments INTEGER DEFAULT 0,
  paid_shares INTEGER DEFAULT 0,
  paid_profile_visits INTEGER DEFAULT 0,
  paid_follows INTEGER DEFAULT 0,
  interactive_addon_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tiktok_ad_demographics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and analysts can manage tiktok demographics"
  ON public.tiktok_ad_demographics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Users can view tiktok demographics in their spaces"
  ON public.tiktok_ad_demographics FOR SELECT
  USING (EXISTS (SELECT 1 FROM space_users WHERE space_users.space_id = tiktok_ad_demographics.space_id AND space_users.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tiktok_ad_demographics_updated_at
  BEFORE UPDATE ON public.tiktok_ad_demographics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_tiktok_ad_demographics_space ON public.tiktok_ad_demographics(space_id);
CREATE INDEX idx_tiktok_ad_demographics_campaign ON public.tiktok_ad_demographics(tiktok_campaign_id);
