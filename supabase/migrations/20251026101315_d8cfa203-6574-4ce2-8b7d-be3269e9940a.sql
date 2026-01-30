-- Migration commented out to resolve conflict with 20251112 baseline
-- This migration attempted to alter products table.

-- Add images array field to products table for multiple product images
-- ALTER TABLE public.products
-- ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- COMMENT ON COLUMN public.products.images IS 'Array of additional product image URLs (up to 3 total including image_url)';
