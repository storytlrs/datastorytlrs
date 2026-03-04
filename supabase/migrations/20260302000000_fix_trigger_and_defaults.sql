-- Fix content trigger: replace extensions.http_post with net.http_post
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
  IF NEW.url IS NOT NULL AND NEW.url LIKE '%instagram.com%' THEN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);

    IF supabase_url IS NULL THEN
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
$$;

-- Fix null age/gender values in existing rows
UPDATE public.brand_campaigns SET age = '' WHERE age IS NULL;
UPDATE public.brand_campaigns SET gender = '' WHERE gender IS NULL;
UPDATE public.brand_ad_sets SET age = '' WHERE age IS NULL;
UPDATE public.brand_ad_sets SET gender = '' WHERE gender IS NULL;
UPDATE public.brand_ads SET age = '' WHERE age IS NULL;
UPDATE public.brand_ads SET gender = '' WHERE gender IS NULL;
UPDATE public.tiktok_campaigns SET age = '' WHERE age IS NULL;
UPDATE public.tiktok_campaigns SET gender = '' WHERE gender IS NULL;
