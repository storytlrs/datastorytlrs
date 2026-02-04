-- Add meta_id column to spaces table (not displayed in UI)
ALTER TABLE public.spaces ADD COLUMN meta_id text;