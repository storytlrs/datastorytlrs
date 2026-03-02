CREATE OR REPLACE FUNCTION public.trigger_weekly_snapshot()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  space_record RECORD;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  IF supabase_url IS NULL THEN
    supabase_url := 'https://rzetgajncoedibmlfyvl.supabase.co';
  END IF;
  
  FOR space_record IN 
    SELECT id FROM spaces 
    WHERE meta_id IS NOT NULL OR tiktok_id IS NOT NULL
  LOOP
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/sync-and-snapshot',
      body := json_build_object('spaceId', space_record.id)::jsonb,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
      )::jsonb
    );
    
    RAISE NOTICE 'Triggered snapshot for space %', space_record.id;
  END LOOP;
END;
$function$;