
-- Drop expression-based index (can't be used with ON CONFLICT)
DROP INDEX IF EXISTS tiktok_campaigns_space_campaign_demo_key;

-- Set default empty strings instead of null for demographic columns
ALTER TABLE public.tiktok_campaigns
  ALTER COLUMN age SET DEFAULT '',
  ALTER COLUMN gender SET DEFAULT '',
  ALTER COLUMN location SET DEFAULT '';

-- Update any existing nulls
UPDATE public.tiktok_campaigns SET age = '' WHERE age IS NULL;
UPDATE public.tiktok_campaigns SET gender = '' WHERE gender IS NULL;
UPDATE public.tiktok_campaigns SET location = '' WHERE location IS NULL;

-- Make columns NOT NULL
ALTER TABLE public.tiktok_campaigns
  ALTER COLUMN age SET NOT NULL,
  ALTER COLUMN gender SET NOT NULL,
  ALTER COLUMN location SET NOT NULL;

-- Create regular unique constraint
ALTER TABLE public.tiktok_campaigns
  ADD CONSTRAINT tiktok_campaigns_space_campaign_demo_key UNIQUE (space_id, campaign_id, age, gender, location);
