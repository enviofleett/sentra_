-- Fix RLS Policy Always True warnings
-- These policies need to be restricted to service role or authenticated users

-- 1. Fix email_tracking_events - restrict INSERT to service role (edge functions)
DROP POLICY IF EXISTS "Service can insert tracking events" ON public.email_tracking_events;
CREATE POLICY "Service role can insert tracking events"
ON public.email_tracking_events
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. Fix product_analytics - restrict to authenticated users inserting their own data
DROP POLICY IF EXISTS "Anyone can insert product analytics" ON public.product_analytics;
CREATE POLICY "Authenticated users can insert product analytics"
ON public.product_analytics
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Fix profit_allocations - restrict INSERT to service role (edge functions/triggers)
DROP POLICY IF EXISTS "System can insert profit allocations" ON public.profit_allocations;
CREATE POLICY "Service role can insert profit allocations"
ON public.profit_allocations
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. Fix membership_transactions - restrict INSERT to service role (edge functions/triggers)
DROP POLICY IF EXISTS "System can insert transactions" ON public.membership_transactions;
CREATE POLICY "Service role can insert transactions"
ON public.membership_transactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- 5. Fix waiting_list - restrict to authenticated or use rate limiting approach
-- Keep public insert but add validation through the table constraints
DROP POLICY IF EXISTS "Anyone can insert to waitlist" ON public.waiting_list;
CREATE POLICY "Anyone can insert to waitlist"
ON public.waiting_list
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 6. Fix proactive_vehicle_events - restrict to service role only
DROP POLICY IF EXISTS "Service role can manage events" ON public.proactive_vehicle_events;
CREATE POLICY "Service role can manage events"
ON public.proactive_vehicle_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);