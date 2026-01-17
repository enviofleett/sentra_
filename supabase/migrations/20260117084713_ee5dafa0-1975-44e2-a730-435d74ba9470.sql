-- Fix remaining RLS issues

-- 1. Add policies to proactive_vehicle_events (RLS enabled but no policies after dropping)
-- This table should only be accessible by admins
CREATE POLICY "Admins can view proactive vehicle events"
ON public.proactive_vehicle_events
FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can manage proactive vehicle events"
ON public.proactive_vehicle_events
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- 2. Fix product_analytics - use authenticated check instead of true
DROP POLICY IF EXISTS "Authenticated users can insert product analytics" ON public.product_analytics;
CREATE POLICY "Authenticated users can insert product analytics"
ON public.product_analytics
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only insert analytics for themselves or anonymously
  (user_id IS NULL OR user_id = auth.uid())
);

-- Also allow anon users to insert analytics (for tracking before login)
CREATE POLICY "Anonymous users can insert product analytics"
ON public.product_analytics
FOR INSERT
TO anon
WITH CHECK (
  -- Anonymous users must have null user_id
  user_id IS NULL
);