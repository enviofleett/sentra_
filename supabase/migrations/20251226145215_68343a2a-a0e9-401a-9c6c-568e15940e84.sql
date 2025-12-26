-- =====================================================
-- CMS Tables for Admin Content Management
-- =====================================================

-- 1. Site Content Table (for editable text elements)
CREATE TABLE public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  content_key TEXT NOT NULL,
  content_value TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(section, content_key)
);

-- 2. Site Banners Table (for banner images and sections)
CREATE TABLE public.site_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  button_text TEXT,
  button_link TEXT,
  image_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Featured Brands Table (for brand logo bar)
CREATE TABLE public.featured_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_brands ENABLE ROW LEVEL SECURITY;

-- RLS Policies for site_content
CREATE POLICY "Anyone can view site content"
  ON public.site_content FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage site content"
  ON public.site_content FOR ALL
  USING (is_admin());

-- RLS Policies for site_banners
CREATE POLICY "Anyone can view active banners"
  ON public.site_banners FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage site banners"
  ON public.site_banners FOR ALL
  USING (is_admin());

-- RLS Policies for featured_brands
CREATE POLICY "Anyone can view active brands"
  ON public.featured_brands FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage featured brands"
  ON public.featured_brands FOR ALL
  USING (is_admin());

-- Create updated_at trigger for all new tables
CREATE TRIGGER update_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_banners_updated_at
  BEFORE UPDATE ON public.site_banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_featured_brands_updated_at
  BEFORE UPDATE ON public.featured_brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for CMS banners
INSERT INTO storage.buckets (id, name, public) 
VALUES ('site-banners', 'site-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for site-banners bucket
CREATE POLICY "Public can view site banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-banners');

CREATE POLICY "Admins can upload site banners"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'site-banners' AND is_admin());

CREATE POLICY "Admins can update site banners"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'site-banners' AND is_admin());

CREATE POLICY "Admins can delete site banners"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'site-banners' AND is_admin());

-- Seed default content
INSERT INTO public.site_content (section, content_key, content_value, content_type) VALUES
  ('hero', 'headline', 'Smell is a word • Perfume is literature', 'text'),
  ('hero', 'subheadline', 'Discover the beauty of fragrance with our collection of premium perfumes to enrich your everyday smell', 'text'),
  ('hero', 'button_text', 'Shop Now', 'text'),
  ('popular_products', 'title', 'Popular Products', 'text'),
  ('new_products', 'title', 'New Products', 'text'),
  ('circles', 'title', 'Sentra Circles', 'text'),
  ('circles', 'description', 'Join an exclusive collective of fragrance enthusiasts. Unlock special pricing when you join a circle.', 'text')
ON CONFLICT (section, content_key) DO NOTHING;