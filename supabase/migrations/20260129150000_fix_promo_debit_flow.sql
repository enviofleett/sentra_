-- Ensure 'promo_debit' exists in wallet_transaction_type
ALTER TYPE public.wallet_transaction_type ADD VALUE IF NOT EXISTS 'promo_debit';

-- Re-create the function to ensure it uses the correct enum value and logic
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
    true, p_order_id::TEXT, 'order', p_description
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;
