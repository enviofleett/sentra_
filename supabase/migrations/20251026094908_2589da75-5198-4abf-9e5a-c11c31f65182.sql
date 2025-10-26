-- Add 'vendor' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendor';

-- Create vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL UNIQUE,
  bank_info JSONB,
  store_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on vendors table
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin-only access)
CREATE POLICY "Admins can view and manage all vendors"
  ON public.vendors FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Add updated_at trigger
CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Link products to vendors
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE RESTRICT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON public.products(vendor_id);

-- Insert a default vendor for existing products
INSERT INTO public.vendors (rep_full_name, email, store_location)
VALUES ('Sentra Perfumes Main', 'admin@sentraperfumes.com', 'Head Office')
ON CONFLICT (email) DO NOTHING;

-- Update existing products to use the default vendor
UPDATE public.products 
SET vendor_id = (SELECT id FROM public.vendors WHERE email = 'admin@sentraperfumes.com' LIMIT 1)
WHERE vendor_id IS NULL;