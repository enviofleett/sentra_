-- Strengthen is_admin() to explicitly handle null auth.uid()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE 
      WHEN auth.uid() IS NULL THEN false
      ELSE public.has_role(auth.uid(), 'admin')
    END,
    false
  )
$$;

-- Strengthen has_role() with same null protection
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
        AND _user_id IS NOT NULL
    )),
    false
  )
$$;

-- Create a secure view for non-admin profile access that masks sensitive data
CREATE OR REPLACE VIEW public.profiles_masked AS
SELECT 
  id,
  email,
  full_name,
  -- Mask phone number (show last 4 digits only)
  CASE 
    WHEN is_admin() THEN phone
    WHEN auth.uid() = id THEN phone
    ELSE CASE 
      WHEN phone IS NOT NULL THEN '****' || RIGHT(phone, 4)
      ELSE NULL
    END
  END as phone,
  -- Mask addresses for non-owners/non-admins
  CASE 
    WHEN is_admin() THEN default_shipping_address
    WHEN auth.uid() = id THEN default_shipping_address
    ELSE NULL
  END as default_shipping_address,
  CASE 
    WHEN is_admin() THEN default_billing_address
    WHEN auth.uid() = id THEN default_billing_address
    ELSE NULL
  END as default_billing_address,
  affiliate_code,
  current_rank_id,
  referred_by,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_masked TO authenticated;

-- Add comment explaining the security measures
COMMENT ON FUNCTION public.is_admin() IS 'Checks if current user has admin role. Returns false for unauthenticated users.';