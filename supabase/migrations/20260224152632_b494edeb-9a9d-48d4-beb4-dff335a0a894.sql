
CREATE TABLE public.screenshot_influencer (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'instagram',
  content_type TEXT,
  reach INTEGER,
  impressions INTEGER,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  saves INTEGER,
  shares INTEGER,
  reposts INTEGER,
  sticker_clicks INTEGER,
  link_clicks INTEGER,
  watch_time INTEGER,
  avg_watch_time INTEGER,
  views_3s NUMERIC,
  screenshot_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.screenshot_influencer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and analysts can manage screenshot_influencer"
ON public.screenshot_influencer
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Users can view screenshot_influencer in their spaces"
ON public.screenshot_influencer
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM reports r
    JOIN space_users su ON r.space_id = su.space_id
    WHERE r.id = screenshot_influencer.report_id AND su.user_id = auth.uid()
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE TRIGGER update_screenshot_influencer_updated_at
BEFORE UPDATE ON public.screenshot_influencer
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
