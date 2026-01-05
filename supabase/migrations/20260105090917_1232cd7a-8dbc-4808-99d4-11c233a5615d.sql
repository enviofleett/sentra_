-- Drop the SECURITY DEFINER view and recreate with INVOKER (default, safer)
DROP VIEW IF EXISTS public.profiles_masked;

-- Recreate view without SECURITY DEFINER - it will use RLS of the querying user
CREATE VIEW public.profiles_masked 
WITH (security_invoker = true)
AS
SELECT 
  id,
  email,
  full_name,
  -- Mask phone number for non-owners (admins see full via direct table access)
  CASE 
    WHEN auth.uid() = id THEN phone
    ELSE CASE 
      WHEN phone IS NOT NULL THEN '****' || RIGHT(phone, 4)
      ELSE NULL
    END
  END as phone,
  -- Mask addresses for non-owners
  CASE 
    WHEN auth.uid() = id THEN default_shipping_address
    ELSE NULL
  END as default_shipping_address,
  CASE 
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

-- Add comment
COMMENT ON VIEW public.profiles_masked IS 'Masked profile view - sensitive fields hidden for non-owners. Admins should query profiles table directly.';