-- Add space_id column to content table
ALTER TABLE public.content 
ADD COLUMN space_id uuid REFERENCES public.spaces(id);

-- Create index for better query performance
CREATE INDEX idx_content_space_id ON public.content(space_id);

-- Backfill existing content with space_id from their reports
UPDATE public.content c
SET space_id = r.space_id
FROM public.reports r
WHERE c.report_id = r.id AND c.space_id IS NULL;