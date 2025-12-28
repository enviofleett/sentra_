-- Add new fields to pre_launch_settings for waitlist page customization
ALTER TABLE public.pre_launch_settings
ADD COLUMN IF NOT EXISTS headline_text text DEFAULT 'Exclusive fragrances at BETTER PRICES always.',
ADD COLUMN IF NOT EXISTS headline_accent text DEFAULT 'at BETTER PRICES',
ADD COLUMN IF NOT EXISTS description_text text DEFAULT 'Join our exclusive waiting list to get early access to premium fragrances at unbeatable prices. Plus, earn rewards just for signing up!',
ADD COLUMN IF NOT EXISTS badge_1_text text DEFAULT '₦100,000 Credits',
ADD COLUMN IF NOT EXISTS badge_1_icon text DEFAULT 'gift',
ADD COLUMN IF NOT EXISTS badge_2_text text DEFAULT '24hr Early Access',
ADD COLUMN IF NOT EXISTS badge_2_icon text DEFAULT 'clock';