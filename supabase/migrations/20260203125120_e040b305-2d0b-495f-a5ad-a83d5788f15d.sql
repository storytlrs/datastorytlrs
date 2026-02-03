-- 1. Přejmenování campaign_planning na campaign_meta
ALTER TABLE campaign_planning RENAME TO campaign_meta;

-- Přejmenování RLS politik pro campaign_meta
DROP POLICY IF EXISTS "Admins and analysts can manage campaign planning" ON campaign_meta;
DROP POLICY IF EXISTS "Users can view campaign planning in their spaces" ON campaign_meta;

CREATE POLICY "Admins and analysts can manage campaign meta"
  ON campaign_meta FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Users can view campaign meta in their spaces"
  ON campaign_meta FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM reports r
    JOIN space_users su ON r.space_id = su.space_id
    WHERE r.id = campaign_meta.report_id AND su.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'));

-- 2. Přejmenování ad_creatives na ad_sets
ALTER TABLE ad_creatives RENAME TO ad_sets;

-- Přejmenování RLS politik pro ad_sets
DROP POLICY IF EXISTS "Admins and analysts can manage ad creatives" ON ad_sets;
DROP POLICY IF EXISTS "Users can view ad creatives in their spaces" ON ad_sets;

CREATE POLICY "Admins and analysts can manage ad sets"
  ON ad_sets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Users can view ad sets in their spaces"
  ON ad_sets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM reports r
    JOIN space_users su ON r.space_id = su.space_id
    WHERE r.id = ad_sets.report_id AND su.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'));

-- 3. Vytvoření nové tabulky ads
CREATE TABLE ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id uuid NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  ad_id text,
  ad_name text NOT NULL,
  date_start date,
  date_stop date,
  age text,
  gender text,
  platform platform_type NOT NULL,
  amount_spent numeric DEFAULT 0,
  reach integer DEFAULT 0,
  impressions integer DEFAULT 0,
  frequency numeric DEFAULT 0,
  cpm numeric DEFAULT 0,
  thruplays integer DEFAULT 0,
  thruplay_rate numeric DEFAULT 0,
  cost_per_thruplay numeric DEFAULT 0,
  video_3s_plays integer DEFAULT 0,
  view_rate_3s numeric DEFAULT 0,
  cost_per_3s_play numeric DEFAULT 0,
  video_avg_play_time numeric DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  cpe numeric DEFAULT 0,
  post_reactions integer DEFAULT 0,
  post_comments integer DEFAULT 0,
  post_shares integer DEFAULT 0,
  post_saves integer DEFAULT 0,
  instagram_profile_visits integer DEFAULT 0,
  instagram_follows integer DEFAULT 0,
  link_clicks integer DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS pro ads
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and analysts can manage ads"
  ON ads FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Users can view ads in their spaces"
  ON ads FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM reports r
    JOIN space_users su ON r.space_id = su.space_id
    WHERE r.id = ads.report_id AND su.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'));

-- Trigger pro automatickou aktualizaci updated_at
CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();