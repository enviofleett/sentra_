-- Add additional social media handles to waiting_list
ALTER TABLE public.waiting_list 
ADD COLUMN IF NOT EXISTS facebook_handle TEXT,
ADD COLUMN IF NOT EXISTS tiktok_handle TEXT;

-- Add banner and launch date fields to pre_launch_settings
ALTER TABLE public.pre_launch_settings 
ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
ADD COLUMN IF NOT EXISTS banner_title TEXT,
ADD COLUMN IF NOT EXISTS banner_subtitle TEXT;