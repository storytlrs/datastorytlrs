-- Add content_summary column to content table
ALTER TABLE public.content 
ADD COLUMN content_summary TEXT;