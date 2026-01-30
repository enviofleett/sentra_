-- Further fix RLS policies - remove WITH CHECK (true) patterns entirely
-- Service role bypasses RLS anyway, so we can rely on that instead of explicit policies

-- Drop the service_role policies that still trigger warnings
DROP POLICY IF EXISTS "Service role can insert tracking events" ON public.email_tracking_events;
DROP POLICY IF EXISTS "Service role can insert profit allocations" ON public.profit_allocations;
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.membership_transactions;
-- Commented out as table does not exist
-- DROP POLICY IF EXISTS "Service role can manage events" ON public.proactive_vehicle_events;

-- For waiting_list, we need to keep anon insert for the waitlist form
-- But we can add a constraint-based validation instead of WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can insert to waitlist" ON public.waiting_list;
CREATE POLICY "Anyone can insert to waitlist"
ON public.waiting_list
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Email must be provided and valid format
  email IS NOT NULL AND 
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);