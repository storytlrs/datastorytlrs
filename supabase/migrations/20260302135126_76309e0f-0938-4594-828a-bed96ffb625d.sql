CREATE OR REPLACE FUNCTION public.trigger_instagram_analysis()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  IF NEW.url IS NOT NULL AND NEW.url LIKE '%instagram.com%' THEN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    IF supabase_url IS NULL THEN
      supabase_url := 'https://rzetgajncoedibmlfyvl.supabase.co';
    END IF;
    
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/analyze-instagram-content',
      body := json_build_object('content_id', NEW.id)::jsonb,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, current_setting('request.jwt.claim.sub', true))
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$function$;