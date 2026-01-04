-- Update the verify_and_reward_user function to also credit the wallet
CREATE OR REPLACE FUNCTION public.verify_and_reward_user(entry_id uuid, admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_verified BOOLEAN;
BEGIN
  -- Check if already verified
  SELECT is_social_verified INTO v_already_verified 
  FROM waiting_list WHERE id = entry_id;
  
  IF v_already_verified THEN
    RETURN false;
  END IF;
  
  -- Update the waitlist entry
  UPDATE waiting_list 
  SET 
    is_social_verified = true,
    reward_credited = true,
    verified_at = now(),
    verified_by = admin_id,
    updated_at = now()
  WHERE id = entry_id;
  
  RETURN true;
END;
$$;

-- Create a function to credit wallet for a user
CREATE OR REPLACE FUNCTION public.credit_waitlist_reward(p_user_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_new_balance numeric;
BEGIN
  -- Get or create wallet
  SELECT id INTO v_wallet_id FROM user_wallets WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO user_wallets (user_id, balance_promo, balance_real)
    VALUES (p_user_id, p_amount, 0)
    RETURNING id, balance_promo INTO v_wallet_id, v_new_balance;
  ELSE
    UPDATE user_wallets 
    SET balance_promo = balance_promo + p_amount, updated_at = now()
    WHERE id = v_wallet_id
    RETURNING balance_promo INTO v_new_balance;
  END IF;
  
  -- Record the transaction
  INSERT INTO wallet_transactions (
    user_id, 
    wallet_id, 
    type, 
    amount, 
    balance_after, 
    is_promo, 
    description,
    reference_type
  ) VALUES (
    p_user_id,
    v_wallet_id,
    'promo_credit',
    p_amount,
    v_new_balance,
    true,
    'Waitlist signup reward - Welcome bonus!',
    'waitlist_reward'
  );
  
  RETURN true;
END;
$$;