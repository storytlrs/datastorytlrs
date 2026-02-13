ALTER TABLE public.reports DROP CONSTRAINT reports_period_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_period_check CHECK (period IN ('monthly', 'quarterly', 'yearly', 'campaign'));