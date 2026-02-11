
-- Add demographic dimension columns
ALTER TABLE public.tiktok_campaigns
  ADD COLUMN IF NOT EXISTS age text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location text DEFAULT NULL;

-- Drop columns not needed
ALTER TABLE public.tiktok_campaigns
  DROP COLUMN IF EXISTS daily_budget,
  DROP COLUMN IF EXISTS lifetime_budget,
  DROP COLUMN IF EXISTS objective,
  DROP COLUMN IF EXISTS engagements,
  DROP COLUMN IF EXISTS date_start,
  DROP COLUMN IF EXISTS date_stop;

-- Drop old unique constraint and create new one with demographic dimensions
ALTER TABLE public.tiktok_campaigns
  DROP CONSTRAINT IF EXISTS tiktok_campaigns_space_id_campaign_id_key;

CREATE UNIQUE INDEX tiktok_campaigns_space_campaign_demo_key
  ON public.tiktok_campaigns (space_id, campaign_id, COALESCE(age, ''), COALESCE(gender, ''), COALESCE(location, ''));
