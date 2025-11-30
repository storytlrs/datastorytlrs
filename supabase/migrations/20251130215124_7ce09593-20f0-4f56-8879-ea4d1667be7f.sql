-- Add currency column to creators table
ALTER TABLE public.creators ADD COLUMN currency TEXT DEFAULT 'USD';