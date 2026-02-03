-- Remove unnecessary columns from campaign_meta
ALTER TABLE campaign_meta 
  DROP COLUMN IF EXISTS item_name,
  DROP COLUMN IF EXISTS item_type,
  DROP COLUMN IF EXISTS planned_value,
  DROP COLUMN IF EXISTS actual_value,
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS notes;

-- Add new columns to campaign_meta
ALTER TABLE campaign_meta
  ADD COLUMN IF NOT EXISTS internal_id text,
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS account_id text,
  ADD COLUMN IF NOT EXISTS adset_id text,
  ADD COLUMN IF NOT EXISTS adset_name text;