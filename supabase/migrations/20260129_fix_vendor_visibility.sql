-- 1. Enable public access to shipping_weight_rates (Global Rates)
DROP POLICY IF EXISTS "Anyone can read shipping weight rates" ON public.shipping_weight_rates;
CREATE POLICY "Anyone can read shipping weight rates"
  ON public.shipping_weight_rates
  FOR SELECT
  USING (true);

-- 2. Enable public access to vendor_shipping_rules (if exists)
DROP POLICY IF EXISTS "Anyone can read vendor shipping rules" ON public.vendor_shipping_rules;
CREATE POLICY "Anyone can read vendor shipping rules"
  ON public.vendor_shipping_rules
  FOR SELECT
  USING (true);

-- 3. Secure Function to fetch public vendor info (bypassing RLS)
-- Returns essential info for Shipping and Cart/Checkout (MOQ, Name)
CREATE OR REPLACE FUNCTION get_vendor_public_info(vendor_ids UUID[])
RETURNS TABLE (
  id UUID,
  name TEXT,
  shipping_region_id UUID,
  shipping_region_name TEXT,
  min_order_quantity INTEGER
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
    sr.name as shipping_region_name,
    COALESCE(v.min_order_quantity, 1) as min_order_quantity
  FROM vendors v
  LEFT JOIN shipping_regions sr ON v.shipping_region_id = sr.id
  WHERE v.id = ANY(vendor_ids);
END;
$$;

-- Grant execute permission to everyone
GRANT EXECUTE ON FUNCTION get_vendor_public_info(UUID[]) TO public;
GRANT EXECUTE ON FUNCTION get_vendor_public_info(UUID[]) TO anon;
GRANT EXECUTE ON FUNCTION get_vendor_public_info(UUID[]) TO authenticated;
