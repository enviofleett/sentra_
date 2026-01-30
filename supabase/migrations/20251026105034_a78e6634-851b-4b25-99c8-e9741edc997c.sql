-- Migration commented out to resolve conflict with 20251112 baseline
-- This migration attempted to alter products table and create branding bucket.

-- Make vendor_id mandatory on products table
-- ALTER TABLE public.products 
-- ALTER COLUMN vendor_id SET NOT NULL;

-- Add constraint to prevent vendor deletion if products exist
-- ALTER TABLE public.products
-- DROP CONSTRAINT IF EXISTS products_vendor_id_fkey,
-- ADD CONSTRAINT products_vendor_id_fkey 
--   FOREIGN KEY (vendor_id) 
--   REFERENCES public.vendors(id) 
--   ON DELETE RESTRICT;

-- Create storage bucket for branding assets
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('branding', 'branding', true)
-- ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for branding bucket
-- CREATE POLICY "Public can view branding assets"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'branding');

-- CREATE POLICY "Admins can upload branding assets"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'branding' AND public.is_admin());

-- CREATE POLICY "Admins can update branding assets"
-- ON storage.objects FOR UPDATE
-- USING (bucket_id = 'branding' AND public.is_admin());

-- CREATE POLICY "Admins can delete branding assets"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'branding' AND public.is_admin());

-- Add branding configuration keys to app_config
-- INSERT INTO public.app_config (key, value, description)
-- VALUES 
--   ('branding_logo_url', '""'::jsonb, 'URL of the application logo'),
--   ('branding_favicon_url', '""'::jsonb, 'URL of the application favicon')
-- ON CONFLICT (key) DO NOTHING;
