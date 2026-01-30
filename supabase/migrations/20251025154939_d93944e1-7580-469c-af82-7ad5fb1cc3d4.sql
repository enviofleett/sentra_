-- Migration commented out to resolve conflict with 20251112 baseline
-- This migration attempted to create storage buckets that are properly defined in later migrations.

-- Create storage bucket for product images
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('product-images', 'product-images', true);

-- RLS Policies for product images bucket
-- CREATE POLICY "Public can view product images"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'product-images');

-- CREATE POLICY "Admins can upload product images"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'product-images' 
--   AND (
--     public.is_admin() 
--     OR public.is_product_manager()
--   )
-- );

-- CREATE POLICY "Admins can update product images"
-- ON storage.objects FOR UPDATE
-- USING (
--   bucket_id = 'product-images' 
--   AND (
--     public.is_admin() 
--     OR public.is_product_manager()
--   )
-- );

-- CREATE POLICY "Admins can delete product images"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'product-images' 
--   AND (
--     public.is_admin() 
--     OR public.is_product_manager()
--   )
-- );
