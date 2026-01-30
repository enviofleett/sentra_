-- Add promo_refund to wallet_transaction_type enum
DO $$ BEGIN
    ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'promo_refund';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create RPC to refund promo wallet (SECURITY DEFINER)
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
  WHERE reference_id = p_order_id::TEXT
    AND type = 'promo_debit'
  LIMIT 1;

  IF NOT FOUND THEN
    -- No debit found, nothing to refund
    RETURN FALSE;
  END IF;

  -- Check if already refunded
  PERFORM 1 FROM wallet_transactions
  WHERE reference_id = p_order_id::TEXT
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
    true, p_order_id::TEXT, 'order', p_reason
  );

  RETURN TRUE;
END;
$$;
