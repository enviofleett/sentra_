-- Create table for application configuration (e.g., terms and conditions)
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Policies for app_config
-- Non-admin users can read the config (e.g., T&C for checkout)
CREATE POLICY "Everyone can read app config"
  ON public.app_config FOR SELECT
  USING (true);

-- Only Admins can INSERT, UPDATE, or DELETE configuration settings
CREATE POLICY "Admins can manage app config"
  ON public.app_config FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Add a trigger to update updated_at timestamp on this new table
CREATE TRIGGER set_app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert an initial key for Terms and Conditions
INSERT INTO public.app_config (key, value, description)
VALUES 
  (
    'terms_and_conditions',
    '{"content": "By proceeding with checkout, you agree to Sentra Perfumes'' Terms of Service, including our shipping and returns policies. All sales are final on discounted items. Please allow 3-5 business days for processing and shipping."}',
    'The content for the checkout terms and conditions.'
  )
ON CONFLICT (key) DO NOTHING;

-- Update user_roles RLS policies to allow admins to manage roles
-- First drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;

-- Recreate the user read policy
CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins to manage all user roles (INSERT/DELETE)
CREATE POLICY "Admins can manage all user roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());