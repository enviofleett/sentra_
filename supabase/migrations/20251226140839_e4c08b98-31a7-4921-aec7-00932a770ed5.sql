-- =====================================================
-- AFFILIATE & RESELLER ECOSYSTEM
-- =====================================================

-- 1. RESELLER RANKS - Define discount tiers based on volume
CREATE TABLE public.reseller_ranks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  min_monthly_volume NUMERIC NOT NULL DEFAULT 0,
  discount_percentage NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  badge_color TEXT DEFAULT '#D4AF37',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default ranks
INSERT INTO public.reseller_ranks (name, slug, min_monthly_volume, discount_percentage, description, display_order) VALUES
  ('Consumer', 'consumer', 0, 0, 'Standard customer pricing', 0),
  ('Bronze Reseller', 'bronze', 100000, 10, 'Entry-level reseller - 10% discount', 1),
  ('Silver Reseller', 'silver', 500000, 15, 'Growing reseller - 15% discount', 2),
  ('Gold Reseller', 'gold', 1000000, 20, 'Established reseller - 20% discount', 3),
  ('Platinum Reseller', 'platinum', 5000000, 25, 'Premium reseller - 25% discount', 4),
  ('Diamond Reseller', 'diamond', 10000000, 30, 'Elite reseller - 30% discount', 5);

-- 2. AFFILIATE LINKS - Track referral codes
CREATE TABLE public.affiliate_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  clicks INTEGER NOT NULL DEFAULT 0,
  signups INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for quick code lookups
CREATE UNIQUE INDEX idx_affiliate_links_code ON public.affiliate_links(code);
CREATE INDEX idx_affiliate_links_user ON public.affiliate_links(user_id);

-- 3. USER WALLETS - Track real money and promo balances
CREATE TABLE public.user_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_real NUMERIC NOT NULL DEFAULT 0,
  balance_promo NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  pending_withdrawal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_wallets_user ON public.user_wallets(user_id);

-- 4. WALLET TRANSACTIONS - Audit trail for all wallet movements
CREATE TYPE wallet_transaction_type AS ENUM (
  'affiliate_commission',
  'reseller_bonus',
  'referral_signup',
  'promo_credit',
  'withdrawal_request',
  'withdrawal_completed',
  'withdrawal_cancelled',
  'admin_adjustment'
);

CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type wallet_transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  is_promo BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  reference_type TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_type ON public.wallet_transactions(type);

-- 5. WITHDRAWAL REQUESTS
CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled');

CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawal_requests_user ON public.withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);

-- 6. REFERRAL TRACKING - Who referred whom
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_link_id UUID REFERENCES public.affiliate_links(id),
  first_order_id UUID,
  commission_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_id);

-- 7. MONTHLY VOLUME TRACKING - For rank calculations
CREATE TABLE public.monthly_volumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  total_volume NUMERIC NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year_month)
);

CREATE INDEX idx_monthly_volumes_user_month ON public.monthly_volumes(user_id, year_month);

-- 8. ADD AFFILIATE COLUMNS TO PROFILES
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS affiliate_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS current_rank_id UUID REFERENCES public.reseller_ranks(id),
  ADD COLUMN IF NOT EXISTS rank_updated_at TIMESTAMPTZ;

-- 9. AFFILIATE CONFIG - System-wide affiliate settings
CREATE TABLE public.affiliate_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default affiliate config
INSERT INTO public.affiliate_config (key, value, description) VALUES
  ('commission_percentage', '{"default": 5, "influencer": 10, "reseller": 3}'::jsonb, 'Commission percentages by user type'),
  ('referral_signup_bonus', '{"referrer": 500, "referred": 1000}'::jsonb, 'Bonus amounts for referral signups in Naira'),
  ('min_withdrawal_amount', '{"value": 5000}'::jsonb, 'Minimum withdrawal amount in Naira'),
  ('withdrawal_processing_days', '{"value": 3}'::jsonb, 'Business days to process withdrawals'),
  ('rank_evaluation_day', '{"value": 1}'::jsonb, 'Day of month to evaluate rank changes');

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.reseller_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_config ENABLE ROW LEVEL SECURITY;

-- RESELLER RANKS - Public read
CREATE POLICY "Anyone can view active ranks" ON public.reseller_ranks FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage ranks" ON public.reseller_ranks FOR ALL USING (is_admin());

-- AFFILIATE LINKS - Users manage their own
CREATE POLICY "Users can view their own affiliate links" ON public.affiliate_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own affiliate link" ON public.affiliate_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own affiliate link" ON public.affiliate_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all affiliate links" ON public.affiliate_links FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage all affiliate links" ON public.affiliate_links FOR ALL USING (is_admin());

-- USER WALLETS - Users view their own
CREATE POLICY "Users can view their own wallet" ON public.user_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage wallets" ON public.user_wallets FOR ALL USING (is_admin());

-- WALLET TRANSACTIONS - Users view their own
CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT USING (is_admin());
CREATE POLICY "System can insert transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (true);

-- WITHDRAWAL REQUESTS - Users manage their own
CREATE POLICY "Users can view their own withdrawals" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create withdrawal requests" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all withdrawals" ON public.withdrawal_requests FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage withdrawals" ON public.withdrawal_requests FOR UPDATE USING (is_admin());

-- REFERRALS
CREATE POLICY "Users can view referrals they made" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Admins can view all referrals" ON public.referrals FOR SELECT USING (is_admin());
CREATE POLICY "System can manage referrals" ON public.referrals FOR ALL USING (is_admin());

-- MONTHLY VOLUMES
CREATE POLICY "Users can view their own volumes" ON public.monthly_volumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all volumes" ON public.monthly_volumes FOR SELECT USING (is_admin());
CREATE POLICY "System can manage volumes" ON public.monthly_volumes FOR ALL USING (is_admin());

-- AFFILIATE CONFIG - Public read for active config
CREATE POLICY "Anyone can view affiliate config" ON public.affiliate_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage affiliate config" ON public.affiliate_config FOR ALL USING (is_admin());

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION public.generate_affiliate_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM affiliate_links WHERE code = v_code) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

-- Function to create wallet for user (called on signup or first affiliate action)
CREATE OR REPLACE FUNCTION public.ensure_user_wallet(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  SELECT id INTO v_wallet_id FROM user_wallets WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO user_wallets (user_id)
    VALUES (p_user_id)
    RETURNING id INTO v_wallet_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$;

-- Function to add affiliate commission
CREATE OR REPLACE FUNCTION public.add_affiliate_commission(
  p_referrer_id UUID,
  p_order_id UUID,
  p_order_amount NUMERIC,
  p_commission_percentage NUMERIC DEFAULT 5
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_commission NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Calculate commission
  v_commission := ROUND(p_order_amount * p_commission_percentage / 100, 2);
  
  -- Ensure wallet exists
  v_wallet_id := ensure_user_wallet(p_referrer_id);
  
  -- Update wallet balance
  UPDATE user_wallets
  SET 
    balance_real = balance_real + v_commission,
    total_earned = total_earned + v_commission,
    updated_at = now()
  WHERE id = v_wallet_id
  RETURNING balance_real INTO v_new_balance;
  
  -- Record transaction
  INSERT INTO wallet_transactions (
    wallet_id, user_id, type, amount, balance_after, 
    is_promo, reference_id, reference_type, description
  ) VALUES (
    v_wallet_id, p_referrer_id, 'affiliate_commission', v_commission, v_new_balance,
    false, p_order_id, 'order', format('Commission on order %s (%s%%)', p_order_id::text, p_commission_percentage)
  )
  RETURNING id INTO v_transaction_id;
  
  -- Update affiliate link stats
  UPDATE affiliate_links
  SET 
    conversions = conversions + 1,
    total_revenue = total_revenue + p_order_amount,
    updated_at = now()
  WHERE user_id = p_referrer_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Function to process withdrawal request
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_withdrawal_id UUID,
  p_status withdrawal_status,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal RECORD;
  v_new_balance NUMERIC;
BEGIN
  SELECT * INTO v_withdrawal FROM withdrawal_requests WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update withdrawal status
  UPDATE withdrawal_requests
  SET 
    status = p_status,
    admin_notes = COALESCE(p_notes, admin_notes),
    processed_by = p_admin_id,
    processed_at = now(),
    updated_at = now()
  WHERE id = p_withdrawal_id;
  
  -- Handle completed withdrawals
  IF p_status = 'completed' THEN
    UPDATE user_wallets
    SET 
      pending_withdrawal = pending_withdrawal - v_withdrawal.amount,
      total_withdrawn = total_withdrawn + v_withdrawal.amount,
      updated_at = now()
    WHERE id = v_withdrawal.wallet_id
    RETURNING balance_real INTO v_new_balance;
    
    -- Record transaction
    INSERT INTO wallet_transactions (
      wallet_id, user_id, type, amount, balance_after,
      is_promo, reference_id, reference_type, description
    ) VALUES (
      v_withdrawal.wallet_id, v_withdrawal.user_id, 'withdrawal_completed', 
      -v_withdrawal.amount, v_new_balance, false,
      p_withdrawal_id, 'withdrawal', format('Withdrawal to %s ****%s', v_withdrawal.bank_name, right(v_withdrawal.account_number, 4))
    );
  END IF;
  
  -- Handle rejected/cancelled withdrawals - return funds
  IF p_status IN ('rejected', 'cancelled') THEN
    UPDATE user_wallets
    SET 
      balance_real = balance_real + v_withdrawal.amount,
      pending_withdrawal = pending_withdrawal - v_withdrawal.amount,
      updated_at = now()
    WHERE id = v_withdrawal.wallet_id
    RETURNING balance_real INTO v_new_balance;
    
    INSERT INTO wallet_transactions (
      wallet_id, user_id, type, amount, balance_after,
      is_promo, reference_id, reference_type, description
    ) VALUES (
      v_withdrawal.wallet_id, v_withdrawal.user_id, 'withdrawal_cancelled', 
      v_withdrawal.amount, v_new_balance, false,
      p_withdrawal_id, 'withdrawal', format('Withdrawal %s returned to balance', p_status)
    );
  END IF;
  
  RETURN true;
END;
$$;

-- Update timestamps triggers
CREATE TRIGGER update_reseller_ranks_updated_at BEFORE UPDATE ON public.reseller_ranks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_affiliate_links_updated_at BEFORE UPDATE ON public.affiliate_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON public.user_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_volumes_updated_at BEFORE UPDATE ON public.monthly_volumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_affiliate_config_updated_at BEFORE UPDATE ON public.affiliate_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();