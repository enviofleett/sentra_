-- Phase 1: Secure update_product_cost_price function (if exists)
-- First check and create/replace with admin check
DROP FUNCTION IF EXISTS public.update_product_cost_price(uuid, numeric);
CREATE OR REPLACE FUNCTION public.update_product_cost_price(p_product_id uuid, p_cost_price numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY: Only admins can update cost prices
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update product cost prices';
  END IF;
  
  UPDATE products
  SET cost_price = p_cost_price, updated_at = now()
  WHERE id = p_product_id;
  
  RETURN FOUND;
END;
$$;

-- Phase 2.1: Create withdrawal balance validation function and trigger
CREATE OR REPLACE FUNCTION public.validate_withdrawal_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available_balance NUMERIC;
BEGIN
  -- Get the user's available real balance
  SELECT balance_real INTO v_available_balance
  FROM user_wallets
  WHERE user_id = NEW.user_id;

  -- Check if user has a wallet
  IF v_available_balance IS NULL THEN
    RAISE EXCEPTION 'No wallet found for user';
  END IF;

  -- Check if withdrawal amount exceeds available balance
  IF NEW.amount > v_available_balance THEN
    RAISE EXCEPTION 'Insufficient balance: requested %, available %', NEW.amount, v_available_balance;
  END IF;

  -- Check minimum withdrawal amount (optional but good practice)
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than zero';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS validate_withdrawal_balance_trigger ON withdrawal_requests;
CREATE TRIGGER validate_withdrawal_balance_trigger
  BEFORE INSERT ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_withdrawal_balance();

-- Phase 2.2: Create referred_by immutability function and trigger
CREATE OR REPLACE FUNCTION public.protect_referred_by()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If referred_by was already set and someone tries to change it, prevent the change
  IF OLD.referred_by IS NOT NULL AND NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
    -- Silently keep the old value instead of raising an error
    NEW.referred_by := OLD.referred_by;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS protect_referred_by_trigger ON profiles;
CREATE TRIGGER protect_referred_by_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_referred_by();