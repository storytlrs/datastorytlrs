-- Add TikTok Advertiser ID to spaces table
ALTER TABLE public.spaces ADD COLUMN tiktok_id TEXT DEFAULT NULL;