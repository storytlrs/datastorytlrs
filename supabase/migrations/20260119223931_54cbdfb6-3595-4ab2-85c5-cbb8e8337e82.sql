-- Add new columns to content table for influencer reports
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS avg_watch_time integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS views_3s numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reposts integer DEFAULT 0;