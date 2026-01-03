-- Seed announcement bar content
INSERT INTO site_content (section, content_key, content_value, content_type) VALUES 
  ('announcement', 'text', 'FREE STANDARD SHIPPING ON ALL ORDERS OVER ₦50,000', 'text')
ON CONFLICT (section, content_key) DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = now();

-- Seed hero section content
INSERT INTO site_content (section, content_key, content_value, content_type) VALUES 
  ('hero', 'headline', 'The Secrets of Sentra', 'text'),
  ('hero', 'subheadline', 'Get them together (for less!) for dewy, natural-looking coverage that still looks like skin', 'text'),
  ('hero', 'button_text', 'SHOP NOW', 'text'),
  ('hero', 'discover_text', 'Discover', 'text')
ON CONFLICT (section, content_key) DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = now();

-- Seed featured products section content
INSERT INTO site_content (section, content_key, content_value, content_type) VALUES 
  ('featured_products', 'title', 'Featured Products', 'text'),
  ('featured_products', 'subtitle', '', 'text')
ON CONFLICT (section, content_key) DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = now();

-- Seed new products section content
INSERT INTO site_content (section, content_key, content_value, content_type) VALUES 
  ('new_products', 'title', 'New Arrivals', 'text'),
  ('new_products', 'subtitle', 'Fresh from our collection', 'text')
ON CONFLICT (section, content_key) DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = now();

-- Add unique constraint on section + content_key if not exists (for ON CONFLICT to work)
CREATE UNIQUE INDEX IF NOT EXISTS site_content_section_key_idx ON site_content(section, content_key);

-- Clear existing banners and insert fresh ones for hero section
DELETE FROM site_banners WHERE section = 'hero';

INSERT INTO site_banners (section, title, subtitle, button_text, button_link, image_url, display_order, is_active) VALUES 
  ('hero', 'The Secrets of Sentra', 'Get them together (for less!) for dewy, natural-looking coverage that still looks like skin', 'SHOP NOW', '/products', '', 1, true),
  ('hero', 'Premium Fragrances', 'Experience the art of perfumery with our curated collection of luxury scents', 'DISCOVER', '/products', '', 2, true),
  ('hero', 'Exclusive Collection', 'Limited edition perfumes crafted for the discerning connoisseur', 'EXPLORE', '/products', '', 3, true);

-- Clear existing lifestyle banners and insert fresh ones
DELETE FROM site_banners WHERE section IN ('lifestyle_1', 'lifestyle_2');

INSERT INTO site_banners (section, title, subtitle, button_text, button_link, image_url, display_order, is_active) VALUES 
  ('lifestyle_1', 'Natural Beauty Collection', 'UP TO 30% OFF', 'SHOP NOW', '/products?category=natural', '', 1, true),
  ('lifestyle_2', 'Signature Fragrances', 'NEW ARRIVAL', 'SHOP NOW', '/products?category=signature', '', 1, true);

-- Seed default categories for perfume business
INSERT INTO categories (name, slug, description, is_active) VALUES 
  ('For Men', 'for-men', 'Masculine fragrances for the modern gentleman', true),
  ('For Women', 'for-women', 'Elegant feminine scents for every occasion', true),
  ('Unisex', 'unisex', 'Versatile fragrances that transcend gender', true),
  ('Gift Sets', 'gift-sets', 'Curated gift collections for your loved ones', true)
ON CONFLICT (slug) DO NOTHING;

-- Seed featured brands
DELETE FROM featured_brands;

INSERT INTO featured_brands (name, logo_url, display_order, is_active) VALUES 
  ('Chanel', '', 1, true),
  ('Dior', '', 2, true),
  ('Versace', '', 3, true),
  ('Tom Ford', '', 4, true),
  ('Gucci', '', 5, true),
  ('Armani', '', 6, true);