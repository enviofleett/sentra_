-- Secure wallet_transactions and membership_transactions tables
-- Ensure no direct client INSERT/UPDATE/DELETE is possible
-- Only SECURITY DEFINER functions (like credit_waitlist_reward, add_affiliate_commission, etc.) 
-- can insert transactions since they run with elevated privileges

-- Drop any potentially existing permissive INSERT policies (safety cleanup)
DROP POLICY IF EXISTS "System can insert transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON public.membership_transactions;
DROP POLICY IF EXISTS "Anyone can insert" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Anyone can insert" ON public.membership_transactions;

-- Add explicit RESTRICTIVE deny policies for INSERT/UPDATE/DELETE on wallet_transactions
-- This creates defense-in-depth even though RLS default-deny should already block these

CREATE POLICY "Deny direct client inserts on wallet transactions"
ON public.wallet_transactions
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny direct client updates on wallet transactions"
ON public.wallet_transactions
AS RESTRICTIVE
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny direct client deletes on wallet transactions"
ON public.wallet_transactions
AS RESTRICTIVE
FOR DELETE
TO authenticated, anon
USING (false);

-- Add explicit RESTRICTIVE deny policies for INSERT/UPDATE/DELETE on membership_transactions
CREATE POLICY "Deny direct client inserts on membership transactions"
ON public.membership_transactions
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny direct client updates on membership transactions"
ON public.membership_transactions
AS RESTRICTIVE
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny direct client deletes on membership transactions"
ON public.membership_transactions
AS RESTRICTIVE
FOR DELETE
TO authenticated, anon
USING (false);