-- Fix overly permissive INSERT policy by replacing it with a more secure one
-- Drop the permissive policy that allows anyone to insert
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.password_change_audit;

-- Create a more restrictive policy that only allows authenticated users to insert audit logs
-- The service role will bypass RLS anyway, so this just prevents anonymous inserts
CREATE POLICY "Authenticated users can insert audit logs"
ON public.password_change_audit
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);