-- Fix wallet_transactions RLS policy
-- This table should only be written to by service role (edge functions/triggers)
DROP POLICY IF EXISTS "System can insert transactions" ON public.wallet_transactions;

-- No need for an explicit INSERT policy - service_role bypasses RLS
-- The table already has proper SELECT policies for users and admins