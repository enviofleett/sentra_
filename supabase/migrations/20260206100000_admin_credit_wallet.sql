-- Function to allow admins to credit a user's wallet
-- Handles both real and promo balances
-- Records transaction history

CREATE OR REPLACE FUNCTION public.admin_credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT, -- 'real' or 'promo'
  p_description TEXT,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance NUMERIC;
  v_transaction_type TEXT;
  v_is_promo BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- 1. Check if the caller is an admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can credit wallets';
  END IF;

  -- 2. Get user's wallet
  SELECT id INTO v_wallet_id
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_wallet_id IS NULL THEN
    -- Create wallet if it doesn't exist (safety fallback)
    INSERT INTO user_wallets (user_id, balance_real, balance_promo)
    VALUES (p_user_id, 0, 0)
    RETURNING id INTO v_wallet_id;
  END IF;

  -- 3. Determine update logic based on type
  v_is_promo := (p_type = 'promo');
  
  IF v_is_promo THEN
    UPDATE user_wallets
    SET balance_promo = balance_promo + p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id
    RETURNING balance_promo INTO v_new_balance;
    
    v_transaction_type := 'promo_credit';
  ELSE
    UPDATE user_wallets
    SET balance_real = balance_real + p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id
    RETURNING balance_real INTO v_new_balance;
    
    v_transaction_type := 'admin_adjustment';
  END IF;

  -- 4. Record transaction
  INSERT INTO wallet_transactions (
    wallet_id,
    user_id,
    amount,
    type,
    is_promo,
    balance_after,
    description,
    reference_type,
    reference_id,
    metadata
  ) VALUES (
    v_wallet_id,
    p_user_id,
    p_amount,
    v_transaction_type::wallet_transaction_type,
    v_is_promo,
    v_new_balance,
    p_description,
    'admin_credit',
    p_admin_id::TEXT, -- Store admin ID as reference
    jsonb_build_object(
      'credited_by', p_admin_id,
      'reason', p_description,
      'timestamp', NOW()
    )
  );

  -- 5. Return result
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'wallet_id', v_wallet_id,
    'transaction_type', v_transaction_type
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
