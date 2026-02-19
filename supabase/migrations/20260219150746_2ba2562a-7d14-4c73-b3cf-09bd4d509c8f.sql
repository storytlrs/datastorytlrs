
-- Add age and gender columns to brand_campaigns
ALTER TABLE public.brand_campaigns ADD COLUMN IF NOT EXISTS age text NOT NULL DEFAULT '';
ALTER TABLE public.brand_campaigns ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT '';

-- Add age and gender columns to brand_ad_sets
ALTER TABLE public.brand_ad_sets ADD COLUMN IF NOT EXISTS age text NOT NULL DEFAULT '';
ALTER TABLE public.brand_ad_sets ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT '';

-- Add age and gender columns to brand_ads
ALTER TABLE public.brand_ads ADD COLUMN IF NOT EXISTS age text NOT NULL DEFAULT '';
ALTER TABLE public.brand_ads ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT '';

-- Update unique constraints to include age and gender
DROP INDEX IF EXISTS brand_campaigns_space_id_campaign_id_publisher_key;
CREATE UNIQUE INDEX brand_campaigns_space_id_campaign_id_platform_age_gender_key 
ON public.brand_campaigns (space_id, campaign_id, publisher_platform, age, gender);

DROP INDEX IF EXISTS brand_ad_sets_space_id_adset_id_publisher_key;
CREATE UNIQUE INDEX brand_ad_sets_space_id_adset_id_platform_age_gender_key 
ON public.brand_ad_sets (space_id, adset_id, publisher_platform, age, gender);

DROP INDEX IF EXISTS brand_ads_space_id_ad_id_publisher_key;
CREATE UNIQUE INDEX brand_ads_space_id_ad_id_platform_age_gender_key 
ON public.brand_ads (space_id, ad_id, publisher_platform, age, gender);
