-- 1. Secure Function to fetch vendor shipping info (bypassing RLS for specific columns)
CREATE OR REPLACE FUNCTION get_vendor_shipping_info(vendor_ids UUID[])
RETURNS TABLE (
  id UUID,
  name TEXT,
  shipping_region_id UUID,
  region_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id, 
    v.rep_full_name as name, 
    v.shipping_region_id,
    sr.name as region_name
  FROM vendors v
  LEFT JOIN shipping_regions sr ON v.shipping_region_id = sr.id
  WHERE v.id = ANY(vendor_ids);
END;
$$;

-- Grant execute permission to everyone (public/anon)
GRANT EXECUTE ON FUNCTION get_vendor_shipping_info(UUID[]) TO public;
GRANT EXECUTE ON FUNCTION get_vendor_shipping_info(UUID[]) TO anon;
GRANT EXECUTE ON FUNCTION get_vendor_shipping_info(UUID[]) TO authenticated;

-- 2. Allow public access to shipping_weight_rates (Global Rates)
-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can read shipping weight rates" ON public.shipping_weight_rates;
-- Create new policy allowing public access
CREATE POLICY "Anyone can read shipping weight rates"
  ON public.shipping_weight_rates
  FOR SELECT
  USING (true);

-- 3. Allow public access to vendor_shipping_rules (MOQ Rules)
DROP POLICY IF EXISTS "Anyone can read active vendor shipping rules" ON public.vendor_shipping_rules;
CREATE POLICY "Anyone can read active vendor shipping rules"
  ON public.vendor_shipping_rules
  FOR SELECT
  USING (is_active = true);
