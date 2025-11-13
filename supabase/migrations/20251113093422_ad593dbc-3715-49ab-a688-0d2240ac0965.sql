-- Insert sample vendors
INSERT INTO public.vendors (name, description, contact_email, is_active) VALUES
('Chanel', 'Iconic French luxury fashion house known for timeless fragrances', 'contact@chanel.com', true),
('Dior', 'Prestigious French luxury brand with elegant perfume collections', 'info@dior.com', true),
('Tom Ford', 'American luxury brand offering bold and sophisticated scents', 'contact@tomford.com', true),
('Versace', 'Italian luxury fashion house with vibrant fragrance lines', 'info@versace.com', true),
('Gucci', 'Italian luxury brand with contemporary and classic perfumes', 'contact@gucci.com', true)
ON CONFLICT DO NOTHING;

-- Insert sample scent profiles
INSERT INTO public.scent_profiles (name, description, notes) VALUES
('Floral Elegance', 'Delicate and romantic floral bouquet', '{"top": ["Rose", "Jasmine"], "middle": ["Lily", "Peony"], "base": ["Musk", "Sandalwood"]}'),
('Woody Oriental', 'Warm and sophisticated oriental blend', '{"top": ["Bergamot", "Cardamom"], "middle": ["Oud", "Patchouli"], "base": ["Vanilla", "Amber"]}'),
('Fresh Citrus', 'Vibrant and energizing citrus notes', '{"top": ["Lemon", "Orange"], "middle": ["Grapefruit", "Neroli"], "base": ["Cedar", "Vetiver"]}'),
('Spicy Amber', 'Bold and sensual spicy warmth', '{"top": ["Cinnamon", "Pepper"], "middle": ["Amber", "Clove"], "base": ["Leather", "Tobacco"]}'),
('Aquatic Fresh', 'Clean and refreshing marine notes', '{"top": ["Sea Salt", "Mint"], "middle": ["Lavender", "Sage"], "base": ["Driftwood", "Musk"]}')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO public.products (name, description, price, category_id, vendor_id, scent_profile_id, stock_quantity, size, sku, is_active, images) 
SELECT 
  'Chanel No. 5',
  'The iconic fragrance that revolutionized perfumery. A timeless floral aldehyde composition.',
  85000,
  (SELECT id FROM categories WHERE name = 'Women''s Perfumes' LIMIT 1),
  (SELECT id FROM vendors WHERE name = 'Chanel' LIMIT 1),
  (SELECT id FROM scent_profiles WHERE name = 'Floral Elegance' LIMIT 1),
  50,
  '100ml',
  'CHANEL-NO5-100',
  true,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'CHANEL-NO5-100');

INSERT INTO public.products (name, description, price, category_id, vendor_id, scent_profile_id, stock_quantity, size, sku, is_active, images)
SELECT
  'Dior Sauvage',
  'A radically fresh composition with raw and noble ingredients. Masculine and wild.',
  75000,
  (SELECT id FROM categories WHERE name = 'Men''s Colognes' LIMIT 1),
  (SELECT id FROM vendors WHERE name = 'Dior' LIMIT 1),
  (SELECT id FROM scent_profiles WHERE name = 'Fresh Citrus' LIMIT 1),
  75,
  '100ml',
  'DIOR-SAU-100',
  true,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'DIOR-SAU-100');

INSERT INTO public.products (name, description, price, category_id, vendor_id, scent_profile_id, stock_quantity, size, sku, is_active, images)
SELECT
  'Tom Ford Black Orchid',
  'A luxurious and sensual fragrance with rich dark accords and an alluring potion of black orchids.',
  120000,
  (SELECT id FROM categories WHERE name = 'Luxury Collection' LIMIT 1),
  (SELECT id FROM vendors WHERE name = 'Tom Ford' LIMIT 1),
  (SELECT id FROM scent_profiles WHERE name = 'Woody Oriental' LIMIT 1),
  30,
  '100ml',
  'TF-BO-100',
  true,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'TF-BO-100');

INSERT INTO public.products (name, description, price, category_id, vendor_id, scent_profile_id, stock_quantity, size, sku, is_active, images)
SELECT
  'Versace Eros',
  'A fragrance for a strong, passionate man who is master of himself. Fresh, woody, and slightly oriental.',
  65000,
  (SELECT id FROM categories WHERE name = 'Men''s Colognes' LIMIT 1),
  (SELECT id FROM vendors WHERE name = 'Versace' LIMIT 1),
  (SELECT id FROM scent_profiles WHERE name = 'Aquatic Fresh' LIMIT 1),
  60,
  '100ml',
  'VERS-EROS-100',
  true,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'VERS-EROS-100');

INSERT INTO public.products (name, description, price, category_id, vendor_id, scent_profile_id, stock_quantity, size, sku, is_active, images)
SELECT
  'Gucci Guilty',
  'A provocative fragrance for the modern woman and man. Warm and captivating.',
  70000,
  (SELECT id FROM categories WHERE name = 'Unisex Fragrances' LIMIT 1),
  (SELECT id FROM vendors WHERE name = 'Gucci' LIMIT 1),
  (SELECT id FROM scent_profiles WHERE name = 'Spicy Amber' LIMIT 1),
  45,
  '90ml',
  'GUCCI-GUILT-90',
  true,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'GUCCI-GUILT-90');

INSERT INTO public.products (name, description, price, category_id, vendor_id, scent_profile_id, stock_quantity, size, sku, is_active, images)
SELECT
  'Chanel Bleu de Chanel',
  'An aromatic-woody fragrance that reveals the spirit of a man who chooses his own destiny.',
  90000,
  (SELECT id FROM categories WHERE name = 'Men''s Colognes' LIMIT 1),
  (SELECT id FROM vendors WHERE name = 'Chanel' LIMIT 1),
  (SELECT id FROM scent_profiles WHERE name = 'Woody Oriental' LIMIT 1),
  55,
  '100ml',
  'CHANEL-BLEU-100',
  true,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'CHANEL-BLEU-100');

INSERT INTO public.products (name, description, price, category_id, vendor_id, scent_profile_id, stock_quantity, size, sku, is_active, images)
SELECT
  'Dior J''adore',
  'The ultimate feminine fragrance. A modern and incredibly sensual fragrance.',
  95000,
  (SELECT id FROM categories WHERE name = 'Women''s Perfumes' LIMIT 1),
  (SELECT id FROM vendors WHERE name = 'Dior' LIMIT 1),
  (SELECT id FROM scent_profiles WHERE name = 'Floral Elegance' LIMIT 1),
  40,
  '100ml',
  'DIOR-JAD-100',
  true,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'DIOR-JAD-100');

INSERT INTO public.products (name, description, price, category_id, vendor_id, scent_profile_id, stock_quantity, size, sku, is_active, images)
SELECT
  'Tom Ford Tobacco Vanille',
  'A modern take on an old-world men''s club. Opulent and warm with creamy tonka bean.',
  135000,
  (SELECT id FROM categories WHERE name = 'Luxury Collection' LIMIT 1),
  (SELECT id FROM vendors WHERE name = 'Tom Ford' LIMIT 1),
  (SELECT id FROM scent_profiles WHERE name = 'Spicy Amber' LIMIT 1),
  25,
  '100ml',
  'TF-TV-100',
  true,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'TF-TV-100');