-- Add ai_insights column to reports table for storing AI-generated content
ALTER TABLE public.reports 
ADD COLUMN ai_insights text,
ADD COLUMN ai_webhook_url text;