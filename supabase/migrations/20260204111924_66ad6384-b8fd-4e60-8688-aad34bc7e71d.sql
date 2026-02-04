-- Add category column to ai_prompts
ALTER TABLE public.ai_prompts ADD COLUMN category text;

-- Update existing prompts with categories
UPDATE public.ai_prompts SET category = 'AI Insights' WHERE key IN ('insights_system', 'insights_user');
UPDATE public.ai_prompts SET category = 'Sentiment Analysis' WHERE key = 'sentiment_analysis';