-- Make credit_waitlist_reward idempotent to prevent double-crediting
CREATE OR REPLACE FUNCTION public.credit_waitlist_reward(p_user_id uuid, p_amount numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet_id uuid;
  v_new_balance numeric;
  v_existing_count integer;
BEGIN
  -- Check if reward already credited (idempotency check)
  SELECT COUNT(*) INTO v_existing_count 
  FROM wallet_transactions 
  WHERE user_id = p_user_id 
    AND reference_type = 'waitlist_reward';
  
  IF v_existing_count > 0 THEN
    RAISE NOTICE 'Waitlist reward already credited for user %', p_user_id;
    RETURN false; -- Already credited, skip
  END IF;

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
$function$;