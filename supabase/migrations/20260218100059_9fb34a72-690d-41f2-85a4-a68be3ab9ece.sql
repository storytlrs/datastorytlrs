
-- Create media_plan_items table
CREATE TABLE public.media_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id),
  type TEXT,
  placements TEXT,
  media_buying_type TEXT,
  creatives TEXT,
  impressions INTEGER,
  reach INTEGER,
  frequency NUMERIC,
  cpm NUMERIC,
  budget NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_plan_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins and analysts can manage media plan items"
ON public.media_plan_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Users can view media plan items in their spaces"
ON public.media_plan_items
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM space_users
    WHERE space_users.space_id = media_plan_items.space_id
    AND space_users.user_id = auth.uid()
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_media_plan_items_updated_at
BEFORE UPDATE ON public.media_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
