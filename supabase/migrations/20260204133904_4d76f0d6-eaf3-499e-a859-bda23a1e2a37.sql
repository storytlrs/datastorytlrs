-- Enable pg_net extension for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to trigger Instagram content analysis
CREATE OR REPLACE FUNCTION public.trigger_instagram_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only trigger for Instagram URLs
  IF NEW.url IS NOT NULL AND NEW.url LIKE '%instagram.com%' THEN
    -- Get environment variables
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- If settings not available, use direct values from vault or skip
    IF supabase_url IS NULL THEN
      supabase_url := 'https://rzetgajncoedibmlfyvl.supabase.co';
    END IF;
    
    -- Make async HTTP call to analyze-instagram-content edge function
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/analyze-instagram-content',
      body := json_build_object('content_id', NEW.id)::text,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, current_setting('request.jwt.claim.sub', true))
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on content table for new inserts
DROP TRIGGER IF EXISTS on_content_insert_analyze ON public.content;
CREATE TRIGGER on_content_insert_analyze
  AFTER INSERT ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_instagram_analysis();