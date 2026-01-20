-- Fix overly permissive RLS policy on reseller_access table
-- The current "System can manage reseller access" policy uses USING(true) which is too permissive

-- Drop the problematic policy
DROP POLICY IF EXISTS "System can manage reseller access" ON public.reseller_access;

-- Create proper admin-only policy for managing reseller access
CREATE POLICY "Admins can manage reseller access"
ON public.reseller_access
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());