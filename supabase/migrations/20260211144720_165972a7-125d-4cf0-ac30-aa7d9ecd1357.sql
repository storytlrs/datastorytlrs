
-- ========================================
-- 1. DROP tiktok_ad_demographics table
-- ========================================
DROP TABLE IF EXISTS public.tiktok_ad_demographics;

-- ========================================
-- 2. Restructure tiktok_ad_groups to match tiktok_campaigns
-- ========================================

-- Drop Meta-style columns
ALTER TABLE public.tiktok_ad_groups
  DROP COLUMN IF EXISTS thruplays,
  DROP COLUMN IF EXISTS thruplay_rate,
  DROP COLUMN IF EXISTS cost_per_thruplay,
  DROP COLUMN IF EXISTS video_3s_plays,
  DROP COLUMN IF EXISTS view_rate_3s,
  DROP COLUMN IF EXISTS cost_per_3s_play,
  DROP COLUMN IF EXISTS cpe,
  DROP COLUMN IF EXISTS engagement_rate,
  DROP COLUMN IF EXISTS date_start,
  DROP COLUMN IF EXISTS date_stop;

-- Add TikTok-specific columns
ALTER TABLE public.tiktok_ad_groups
  ADD COLUMN IF NOT EXISTS video_play_actions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_view_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_watched_2s integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_watched_6s integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p25 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p50 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p100 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_video_play numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_video_play_per_user numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_visits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interactive_addon_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_engagement numeric DEFAULT 0;

-- ========================================
-- 3. Restructure tiktok_ads to match tiktok_campaigns
-- ========================================

-- Drop Meta-style columns
ALTER TABLE public.tiktok_ads
  DROP COLUMN IF EXISTS thruplays,
  DROP COLUMN IF EXISTS thruplay_rate,
  DROP COLUMN IF EXISTS cost_per_thruplay,
  DROP COLUMN IF EXISTS video_3s_plays,
  DROP COLUMN IF EXISTS view_rate_3s,
  DROP COLUMN IF EXISTS cost_per_3s_play,
  DROP COLUMN IF EXISTS cpe,
  DROP COLUMN IF EXISTS engagement_rate,
  DROP COLUMN IF EXISTS date_start,
  DROP COLUMN IF EXISTS date_stop;

-- Add TikTok-specific columns
ALTER TABLE public.tiktok_ads
  ADD COLUMN IF NOT EXISTS video_play_actions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_view_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_watched_2s integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_watched_6s integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p25 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p50 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p100 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_video_play numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_video_play_per_user numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_visits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interactive_addon_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_engagement numeric DEFAULT 0;
