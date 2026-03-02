CREATE OR REPLACE FUNCTION public.trigger_weekly_snapshot()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  space_record RECORD;
  supabase_url TEXT := 'https://rzetgajncoedibmlfyvl.supabase.co';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZXRnYWpuY29lZGlibWxmeXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MTQ4MTIsImV4cCI6MjA4MDA5MDgxMn0.YU6or_CVQIpqIv6Rho0mx7SgA6VW0ZqGo7XjdRj0QH8';
  service_role_key TEXT;
BEGIN
  -- Try to get service role key from app settings
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  FOR space_record IN 
    SELECT id FROM spaces 
    WHERE meta_id IS NOT NULL OR tiktok_id IS NOT NULL
  LOOP
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/sync-and-snapshot',
      body := json_build_object('spaceId', space_record.id)::jsonb,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, anon_key)
      )::jsonb
    );
    
    RAISE NOTICE 'Triggered snapshot for space %', space_record.id;
  END LOOP;
END;
$function$;