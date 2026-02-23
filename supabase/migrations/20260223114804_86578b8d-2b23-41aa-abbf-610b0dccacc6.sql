
-- Generic snapshot table for all ads metric entities (Meta + TikTok, all hierarchy levels)
CREATE TABLE public.ads_metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- 'meta_campaign', 'meta_ad_set', 'meta_ad', 'tiktok_campaign', 'tiktok_ad_group', 'tiktok_ad'
  entity_id text NOT NULL, -- platform-specific ID (campaign_id, adset_id, ad_id)
  entity_name text, -- human-readable name
  parent_entity_id text, -- parent's platform ID for hierarchy
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb, -- cumulative metric values at snapshot time
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(space_id, entity_type, entity_id, snapshot_date)
);

-- Indexes for efficient querying
CREATE INDEX idx_snapshots_space_type ON public.ads_metric_snapshots(space_id, entity_type);
CREATE INDEX idx_snapshots_entity ON public.ads_metric_snapshots(entity_type, entity_id, snapshot_date);
CREATE INDEX idx_snapshots_date ON public.ads_metric_snapshots(snapshot_date DESC);

-- Enable RLS
ALTER TABLE public.ads_metric_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins and analysts can manage snapshots"
ON public.ads_metric_snapshots
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Users can view snapshots in their spaces"
ON public.ads_metric_snapshots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM space_users
    WHERE space_users.space_id = ads_metric_snapshots.space_id
    AND space_users.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
