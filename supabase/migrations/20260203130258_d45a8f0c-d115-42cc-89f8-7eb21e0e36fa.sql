-- Remove internal_id column from campaign_meta
ALTER TABLE campaign_meta DROP COLUMN IF EXISTS internal_id;