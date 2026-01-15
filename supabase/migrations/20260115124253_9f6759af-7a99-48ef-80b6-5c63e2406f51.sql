-- =============================================
-- MEMBERSHIP SYSTEM: Articles, Wallets, Transactions
-- =============================================

-- 1. CREATE ARTICLES TABLE (CMS)
CREATE TABLE public.articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add updated_at trigger
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view published articles" ON public.articles
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage all articles" ON public.articles
  FOR ALL USING (public.is_admin());

-- Indexes
CREATE INDEX idx_articles_slug ON public.articles(slug);
CREATE INDEX idx_articles_published ON public.articles(is_published, published_at DESC);
CREATE INDEX idx_articles_featured ON public.articles(is_featured, is_published);

-- 2. CREATE MEMBERSHIP WALLETS TABLE
CREATE TABLE public.membership_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  total_deposited DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  total_spent DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add updated_at trigger
CREATE TRIGGER update_membership_wallets_updated_at
  BEFORE UPDATE ON public.membership_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.membership_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own membership wallet" ON public.membership_wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all membership wallets" ON public.membership_wallets
  FOR SELECT USING (public.is_admin());

CREATE POLICY "System can manage membership wallets" ON public.membership_wallets
  FOR ALL USING (public.is_admin());

-- Index
CREATE INDEX idx_membership_wallets_user ON public.membership_wallets(user_id);

-- 3. CREATE MEMBERSHIP TRANSACTIONS TABLE
CREATE TABLE public.membership_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES public.membership_wallets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'purchase', 'refund', 'adjustment')),
  reference_id TEXT,
  reference_type TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.membership_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own transactions" ON public.membership_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.membership_transactions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "System can insert transactions" ON public.membership_transactions
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_membership_transactions_wallet ON public.membership_transactions(wallet_id);
CREATE INDEX idx_membership_transactions_user ON public.membership_transactions(user_id);
CREATE INDEX idx_membership_transactions_type ON public.membership_transactions(type);

-- 4. ADD MEMBERSHIP CONFIGURATION TO APP_CONFIG
INSERT INTO public.app_config (key, value, description)
VALUES 
  ('membership_min_deposit', '{"amount": 50000, "currency": "NGN"}', 'Minimum deposit required to access the members-only store'),
  ('membership_enabled', '{"enabled": false}', 'Toggle to enable/disable members-only mode')
ON CONFLICT (key) DO NOTHING;

-- 5. CREATE HELPER FUNCTIONS

-- Function to ensure membership wallet exists
CREATE OR REPLACE FUNCTION public.ensure_membership_wallet(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  SELECT id INTO v_wallet_id FROM membership_wallets WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO membership_wallets (user_id)
    VALUES (p_user_id)
    RETURNING id INTO v_wallet_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$;

-- Function to credit membership wallet (for deposits)
CREATE OR REPLACE FUNCTION public.credit_membership_wallet(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_description TEXT DEFAULT 'Membership deposit'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  -- Ensure wallet exists
  v_wallet_id := ensure_membership_wallet(p_user_id);
  
  -- Credit the wallet
  UPDATE membership_wallets
  SET 
    balance = balance + p_amount,
    total_deposited = total_deposited + p_amount,
    updated_at = now()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;
  
  -- Record transaction
  INSERT INTO membership_transactions (
    wallet_id, user_id, amount, balance_after, type, 
    reference_id, reference_type, description
  ) VALUES (
    v_wallet_id, p_user_id, p_amount, v_new_balance, 'deposit',
    p_reference, 'paystack', p_description
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Function to debit membership wallet (for purchases)
CREATE OR REPLACE FUNCTION public.debit_membership_wallet(
  p_user_id UUID,
  p_amount DECIMAL,
  p_order_id UUID,
  p_description TEXT DEFAULT 'Store purchase'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet RECORD;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  -- Get wallet and lock for update
  SELECT id, balance INTO v_wallet
  FROM membership_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No membership wallet found for user';
  END IF;
  
  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient membership balance: available %, required %', v_wallet.balance, p_amount;
  END IF;
  
  -- Debit the wallet
  UPDATE membership_wallets
  SET 
    balance = balance - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = now()
  WHERE id = v_wallet.id
  RETURNING balance INTO v_new_balance;
  
  -- Record transaction
  INSERT INTO membership_transactions (
    wallet_id, user_id, amount, balance_after, type, 
    reference_id, reference_type, description
  ) VALUES (
    v_wallet.id, p_user_id, -p_amount, v_new_balance, 'purchase',
    p_order_id::TEXT, 'order', p_description
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Function to check membership status
CREATE OR REPLACE FUNCTION public.check_membership_status(p_user_id UUID)
RETURNS TABLE(is_member BOOLEAN, balance DECIMAL, required_amount DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet_balance DECIMAL;
  v_required_amount DECIMAL;
BEGIN
  -- Get required amount from config
  SELECT (value->>'amount')::DECIMAL INTO v_required_amount
  FROM app_config
  WHERE key = 'membership_min_deposit';
  
  IF v_required_amount IS NULL THEN
    v_required_amount := 50000; -- Default
  END IF;
  
  -- Get user's wallet balance
  SELECT COALESCE(mw.balance, 0) INTO v_wallet_balance
  FROM membership_wallets mw
  WHERE mw.user_id = p_user_id;
  
  IF v_wallet_balance IS NULL THEN
    v_wallet_balance := 0;
  END IF;
  
  RETURN QUERY SELECT 
    (v_wallet_balance >= v_required_amount) AS is_member,
    v_wallet_balance AS balance,
    v_required_amount AS required_amount;
END;
$$;