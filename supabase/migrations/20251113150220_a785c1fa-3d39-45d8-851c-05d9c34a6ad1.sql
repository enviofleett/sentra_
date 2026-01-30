-- Production Schema Updates - Step 2: Update tables and policies

-- 1. Add is_product_manager helper function
CREATE OR REPLACE FUNCTION public.is_product_manager()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'product_manager')
$$;

-- 2. Update vendors table to match VendorsManagement.tsx
ALTER TABLE public.vendors 
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS contact_email,
  DROP COLUMN IF EXISTS contact_phone;

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS rep_full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS bank_info JSONB,
  ADD COLUMN IF NOT EXISTS store_location TEXT;

-- Make required columns non-nullable after adding them
UPDATE public.vendors SET rep_full_name = 'Unknown' WHERE rep_full_name IS NULL;
UPDATE public.vendors SET email = CONCAT('vendor-', id::text, '@example.com') WHERE email IS NULL;

ALTER TABLE public.vendors 
  ALTER COLUMN rep_full_name SET NOT NULL,
  ALTER COLUMN email SET NOT NULL;

-- Add unique constraint on email
DROP INDEX IF EXISTS vendors_email_unique;
CREATE UNIQUE INDEX vendors_email_unique ON public.vendors(email);

-- 3. Update scent_profiles table
ALTER TABLE public.scent_profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- 4. Update products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  DROP COLUMN IF EXISTS scent_profile_id,
  ADD COLUMN IF NOT EXISTS scent_profile TEXT;

-- Make is_featured non-nullable
UPDATE public.products SET is_featured = false WHERE is_featured IS NULL;
ALTER TABLE public.products ALTER COLUMN is_featured SET NOT NULL;

-- Add data validation constraints
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS positive_price;
ALTER TABLE public.products ADD CONSTRAINT positive_price CHECK (price >= 0);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS positive_stock;
ALTER TABLE public.products ADD CONSTRAINT positive_stock CHECK (stock_quantity >= 0);

-- 5. Update profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_shipping_address JSONB,
  ADD COLUMN IF NOT EXISTS default_billing_address JSONB;

-- 6. Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Update RLS policies for vendors
DROP POLICY IF EXISTS "Vendors are viewable by everyone" ON public.vendors;
CREATE POLICY "Public can view vendors" ON public.vendors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage vendors" ON public.vendors;
CREATE POLICY "Admins can manage vendors" ON public.vendors FOR ALL USING (public.is_admin());

-- 8. Update RLS policies for categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins/Managers can manage categories" ON public.categories FOR ALL USING (public.is_product_manager());

-- 9. Update RLS policies for scent_profiles
DROP POLICY IF EXISTS "Scent profiles are viewable by everyone" ON public.scent_profiles;
CREATE POLICY "Public can view active scent profiles" ON public.scent_profiles FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage scent profiles" ON public.scent_profiles;
CREATE POLICY "Admins can manage scent profiles" ON public.scent_profiles FOR ALL USING (public.is_admin());

-- 10. Update RLS policies for products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins/Managers can manage products" ON public.products FOR ALL USING (public.is_product_manager());
