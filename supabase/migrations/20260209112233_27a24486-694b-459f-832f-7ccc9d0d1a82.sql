
-- Drop old report-level ad tables (data already migrated to brand_* tables)
DROP TABLE IF EXISTS ads CASCADE;
DROP TABLE IF EXISTS ad_sets CASCADE;
DROP TABLE IF EXISTS campaign_meta CASCADE;
