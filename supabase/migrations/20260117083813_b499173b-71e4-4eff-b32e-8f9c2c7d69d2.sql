-- Fix vendors table security: restrict access to admins only
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view vendors" ON public.vendors;

-- Create a new admin-only SELECT policy
CREATE POLICY "Admins can view vendors"
ON public.vendors
FOR SELECT
USING (is_admin());