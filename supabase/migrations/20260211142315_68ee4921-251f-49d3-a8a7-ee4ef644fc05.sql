
-- Add missing metric columns to tiktok_campaigns
ALTER TABLE public.tiktok_campaigns
  ADD COLUMN IF NOT EXISTS video_play_actions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_view_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_watched_2s integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_watched_6s integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p25 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p50 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_p100 integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_video_play numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_video_play_per_user numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagements integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_visits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follows integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interactive_addon_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_engagement numeric DEFAULT 0;
