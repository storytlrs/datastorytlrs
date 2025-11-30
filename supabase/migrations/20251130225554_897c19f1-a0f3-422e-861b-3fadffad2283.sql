-- Add new columns to content table for complete data tracking
ALTER TABLE content 
  ADD COLUMN IF NOT EXISTS reach integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sticker_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS link_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sentiment_summary text;