-- Add campaign planning columns to creators table
ALTER TABLE public.creators
ADD COLUMN posts_count INTEGER DEFAULT 0,
ADD COLUMN reels_count INTEGER DEFAULT 0,
ADD COLUMN stories_count INTEGER DEFAULT 0,
ADD COLUMN posts_cost NUMERIC DEFAULT 0,
ADD COLUMN reels_cost NUMERIC DEFAULT 0,
ADD COLUMN stories_cost NUMERIC DEFAULT 0,
ADD COLUMN avg_reach INTEGER DEFAULT 0,
ADD COLUMN avg_views INTEGER DEFAULT 0,
ADD COLUMN avg_engagement_rate NUMERIC DEFAULT 0;