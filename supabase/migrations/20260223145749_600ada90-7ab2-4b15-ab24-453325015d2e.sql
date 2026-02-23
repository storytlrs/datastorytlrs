
-- Add video/engagement metric columns to brand_campaigns (matching brand_ad_sets schema)
ALTER TABLE public.brand_campaigns
  ADD COLUMN IF NOT EXISTS thruplays integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thruplay_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_thruplay numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_3s_plays integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_rate_3s numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_3s_play numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpe numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_reactions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_comments integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_shares integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_saves integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS link_clicks integer DEFAULT 0;
