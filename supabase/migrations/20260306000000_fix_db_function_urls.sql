-- Fix hardcoded old project URL in DB functions
-- Old project: rzetgajncoedibmlfyvl
-- New project: rltxqoupobfohrkrbtib

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

    IF supabase_url IS NULL OR supabase_url = '' THEN
      supabase_url := 'https://rltxqoupobfohrkrbtib.supabase.co';
    END IF;

    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/analyze-instagram-content',
      body := json_build_object('content_id', NEW.id)::jsonb,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
      )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$function$;

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

  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://rltxqoupobfohrkrbtib.supabase.co';
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
