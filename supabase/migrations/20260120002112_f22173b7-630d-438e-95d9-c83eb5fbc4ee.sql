-- Add columns for structured AI insights data
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS ai_insights_structured JSONB,
ADD COLUMN IF NOT EXISTS ai_insights_context JSONB;