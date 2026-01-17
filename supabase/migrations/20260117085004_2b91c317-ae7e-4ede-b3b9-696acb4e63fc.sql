-- Add explicit public/anonymous denial policies for sensitive tables
-- These provide defense-in-depth even though RLS already restricts access

-- 1. profiles - explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- 2. orders - explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to orders"
ON public.orders
FOR SELECT
TO anon
USING (false);

-- 3. vendors - explicitly deny anonymous access (already admin-only but adding explicit denial)
CREATE POLICY "Deny anonymous access to vendors"
ON public.vendors
FOR SELECT
TO anon
USING (false);

-- 4. withdrawal_requests - explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
TO anon
USING (false);

-- 5. waiting_list - explicitly deny anonymous SELECT access
CREATE POLICY "Deny anonymous select on waiting list"
ON public.waiting_list
FOR SELECT
TO anon
USING (false);

-- 6. email_tracking_events - explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to email tracking"
ON public.email_tracking_events
FOR SELECT
TO anon
USING (false);

-- Add explicit denials for warning-level tables as well (defense in depth)

-- 7. user_wallets
CREATE POLICY "Deny anonymous access to user wallets"
ON public.user_wallets
FOR SELECT
TO anon
USING (false);

-- 8. membership_wallets
CREATE POLICY "Deny anonymous access to membership wallets"
ON public.membership_wallets
FOR SELECT
TO anon
USING (false);

-- 9. cart_items
CREATE POLICY "Deny anonymous access to cart items"
ON public.cart_items
FOR SELECT
TO anon
USING (false);

-- 10. group_buy_commitments
CREATE POLICY "Deny anonymous access to group buy commitments"
ON public.group_buy_commitments
FOR SELECT
TO anon
USING (false);

-- 11. affiliate_links
CREATE POLICY "Deny anonymous access to affiliate links"
ON public.affiliate_links
FOR SELECT
TO anon
USING (false);

-- 12. referrals
CREATE POLICY "Deny anonymous access to referrals"
ON public.referrals
FOR SELECT
TO anon
USING (false);

-- 13. monthly_volumes
CREATE POLICY "Deny anonymous access to monthly volumes"
ON public.monthly_volumes
FOR SELECT
TO anon
USING (false);

-- 14. wallet_transactions
CREATE POLICY "Deny anonymous access to wallet transactions"
ON public.wallet_transactions
FOR SELECT
TO anon
USING (false);

-- 15. membership_transactions
CREATE POLICY "Deny anonymous access to membership transactions"
ON public.membership_transactions
FOR SELECT
TO anon
USING (false);

-- 16. profit_allocations
CREATE POLICY "Deny anonymous access to profit allocations"
ON public.profit_allocations
FOR SELECT
TO anon
USING (false);