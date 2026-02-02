-- Fix type mismatch in debit_promo_wallet (reference_id is UUID, not TEXT)
CREATE OR REPLACE FUNCTION public.debit_promo_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_order_id UUID,
  p_description TEXT DEFAULT 'Promo credit applied to order'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_wallet RECORD;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Lock wallet for update
  SELECT id, balance_promo INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No wallet found for user';
  END IF;
  
  IF v_wallet.balance_promo < p_amount THEN
    RAISE EXCEPTION 'Insufficient promo balance: available %, required %', v_wallet.balance_promo, p_amount;
  END IF;
  
  -- Debit the promo balance
  UPDATE user_wallets
  SET balance_promo = balance_promo - p_amount, updated_at = now()
  WHERE id = v_wallet.id
  RETURNING balance_promo INTO v_new_balance;
  
  -- Record transaction
  INSERT INTO wallet_transactions (
    wallet_id, user_id, type, amount, balance_after,
    is_promo, reference_id, reference_type, description
  ) VALUES (
    v_wallet.id, p_user_id, 'promo_debit', -p_amount, v_new_balance,
    true, p_order_id, 'order', p_description
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Fix type mismatch in refund_promo_wallet (reference_id is UUID, not TEXT)
CREATE OR REPLACE FUNCTION public.refund_promo_wallet(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Order cancelled or payment failed'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_transaction RECORD;
  v_wallet_id UUID;
  v_new_balance NUMERIC;
BEGIN
  -- Find the original debit transaction
  SELECT * INTO v_transaction
  FROM wallet_transactions
  WHERE reference_id = p_order_id
    AND type = 'promo_debit'
  LIMIT 1;

  IF NOT FOUND THEN
    -- No debit found, nothing to refund
    RETURN FALSE;
  END IF;

  -- Check if already refunded
  PERFORM 1 FROM wallet_transactions
  WHERE reference_id = p_order_id
    AND type = 'promo_refund';
    
  IF FOUND THEN
    RETURN FALSE;
  END IF;

  -- Get wallet id
  v_wallet_id := v_transaction.wallet_id;

  -- Credit the promo balance back
  UPDATE user_wallets
  SET balance_promo = balance_promo + ABS(v_transaction.amount), updated_at = now()
  WHERE id = v_wallet_id
  RETURNING balance_promo INTO v_new_balance;

  -- Record refund transaction
  INSERT INTO wallet_transactions (
    wallet_id, user_id, type, amount, balance_after,
    is_promo, reference_id, reference_type, description
  ) VALUES (
    v_wallet_id, v_transaction.user_id, 'promo_refund', ABS(v_transaction.amount), v_new_balance,
    true, p_order_id, 'order', p_reason
  );

  RETURN TRUE;
END;
$$;
