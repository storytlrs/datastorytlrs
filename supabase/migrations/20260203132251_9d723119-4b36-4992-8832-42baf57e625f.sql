-- Add unique constraints for upsert operations in Meta API import
CREATE UNIQUE INDEX IF NOT EXISTS ad_sets_report_ad_id_unique ON ad_sets(report_id, ad_id);
CREATE UNIQUE INDEX IF NOT EXISTS ads_report_ad_id_unique ON ads(report_id, ad_id);