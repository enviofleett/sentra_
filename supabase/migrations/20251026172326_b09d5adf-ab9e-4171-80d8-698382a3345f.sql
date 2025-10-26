-- Create scent_profiles table
CREATE TABLE public.scent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scent_profiles ENABLE ROW LEVEL SECURITY;

-- Public can view active scent profiles
CREATE POLICY "Public can view active scent profiles"
ON public.scent_profiles
FOR SELECT
USING (is_active = true);

-- Admins can view all scent profiles
CREATE POLICY "Admins can view all scent profiles"
ON public.scent_profiles
FOR SELECT
USING (is_admin());

-- Admins can insert scent profiles
CREATE POLICY "Admins can insert scent profiles"
ON public.scent_profiles
FOR INSERT
WITH CHECK (is_admin());

-- Admins can update scent profiles
CREATE POLICY "Admins can update scent profiles"
ON public.scent_profiles
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Admins can delete scent profiles
CREATE POLICY "Admins can delete scent profiles"
ON public.scent_profiles
FOR DELETE
USING (is_admin());

-- Insert default scent profiles
INSERT INTO public.scent_profiles (name, display_order) VALUES
  ('floral', 1),
  ('citrus', 2),
  ('woody', 3),
  ('oriental', 4),
  ('fresh', 5),
  ('spicy', 6),
  ('aquatic', 7),
  ('gourmand', 8);

-- Create trigger for updated_at
CREATE TRIGGER update_scent_profiles_updated_at
BEFORE UPDATE ON public.scent_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();