-- Add sentiment_webhook_url column to reports table
ALTER TABLE public.reports 
ADD COLUMN sentiment_webhook_url text;