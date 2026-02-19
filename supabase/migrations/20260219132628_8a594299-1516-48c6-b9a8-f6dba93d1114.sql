
-- Add publisher_platform column to brand_campaigns
ALTER TABLE public.brand_campaigns ADD COLUMN publisher_platform text DEFAULT 'unknown';

-- Add publisher_platform column to brand_ad_sets
ALTER TABLE public.brand_ad_sets ADD COLUMN publisher_platform text DEFAULT 'unknown';

-- Add publisher_platform column to brand_ads
ALTER TABLE public.brand_ads ADD COLUMN publisher_platform text DEFAULT 'unknown';

-- Drop existing unique constraints and recreate with publisher_platform
-- brand_campaigns
ALTER TABLE public.brand_campaigns DROP CONSTRAINT IF EXISTS brand_campaigns_space_id_campaign_id_key;
CREATE UNIQUE INDEX brand_campaigns_space_id_campaign_id_publisher_key ON public.brand_campaigns (space_id, campaign_id, publisher_platform);

-- brand_ad_sets
ALTER TABLE public.brand_ad_sets DROP CONSTRAINT IF EXISTS brand_ad_sets_space_id_adset_id_key;
CREATE UNIQUE INDEX brand_ad_sets_space_id_adset_id_publisher_key ON public.brand_ad_sets (space_id, adset_id, publisher_platform);

-- brand_ads
ALTER TABLE public.brand_ads DROP CONSTRAINT IF EXISTS brand_ads_space_id_ad_id_key;
CREATE UNIQUE INDEX brand_ads_space_id_ad_id_publisher_key ON public.brand_ads (space_id, ad_id, publisher_platform);
