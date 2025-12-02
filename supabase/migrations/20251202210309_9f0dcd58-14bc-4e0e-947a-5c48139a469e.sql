-- Create storage bucket for content thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-thumbnails', 'content-thumbnails', true);

-- Allow authenticated users to upload thumbnails
CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-thumbnails');

-- Allow public read access
CREATE POLICY "Public can view thumbnails"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'content-thumbnails');

-- Allow authenticated users to update thumbnails
CREATE POLICY "Authenticated users can update thumbnails"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'content-thumbnails');

-- Allow authenticated users to delete thumbnails
CREATE POLICY "Authenticated users can delete thumbnails"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'content-thumbnails');