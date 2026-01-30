-- Audit and Backfill missing promo debits
DO $$
DECLARE
  v_order RECORD;
  v_wallet_id UUID;
  v_new_balance NUMERIC;
  v_missing_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting audit of promo debits...';

  FOR v_order IN 
    SELECT * FROM orders 
    WHERE promo_discount_applied > 0 
    AND status != 'cancelled'
  LOOP
    -- Check if a promo debit transaction exists for this order
    PERFORM 1 FROM wallet_transactions 
    WHERE reference_id = v_order.id::TEXT 
      AND type = 'promo_debit';
      
    IF NOT FOUND THEN
      -- Missing debit found!
      v_missing_count := v_missing_count + 1;
      RAISE NOTICE 'Missing promo debit for Order % (User %), Amount: %', v_order.id, v_order.user_id, v_order.promo_discount_applied;
      
      -- Get user wallet
      SELECT id, balance_promo INTO v_wallet_id, v_new_balance
      FROM user_wallets
      WHERE user_id = v_order.user_id;
      
      IF v_wallet_id IS NOT NULL THEN
        -- 1. Deduct from balance (even if it goes negative, to reflect history correctly)
        -- We are "correcting" the balance which was artificially high
        UPDATE user_wallets
        SET balance_promo = balance_promo - v_order.promo_discount_applied,
            updated_at = now()
        WHERE id = v_wallet_id
        RETURNING balance_promo INTO v_new_balance;
        
        -- 2. Insert the missing transaction
        INSERT INTO wallet_transactions (
          wallet_id, user_id, type, amount, balance_after,
          is_promo, reference_id, reference_type, description, created_at
        ) VALUES (
          v_wallet_id, v_order.user_id, 'promo_debit', -v_order.promo_discount_applied, v_new_balance,
          true, v_order.id::TEXT, 'order', 'Backfilled: Promo credit applied to order', v_order.created_at
        );
        
        RAISE NOTICE 'Backfilled debit for Order %. New Balance: %', v_order.id, v_new_balance;
      ELSE
        RAISE WARNING 'User wallet not found for User % (Order %)', v_order.user_id, v_order.id;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Audit complete. Backfilled % missing transactions.', v_missing_count;
END $$;
