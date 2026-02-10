-- Add period column to reports
ALTER TABLE public.reports ADD COLUMN period text DEFAULT 'monthly' CHECK (period IN ('monthly', 'quarterly', 'yearly'));