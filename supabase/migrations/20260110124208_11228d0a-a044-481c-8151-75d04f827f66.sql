-- Phase 1: Financial Upgrades Migration

-- 1. Add Subaccount Codes to profit_split_config
ALTER TABLE public.profit_split_config
ADD COLUMN IF NOT EXISTS capital_subaccount_code TEXT,
ADD COLUMN IF NOT EXISTS growth_subaccount_code TEXT,
ADD COLUMN IF NOT EXISTS admin_subaccount_code TEXT,
ADD COLUMN IF NOT EXISTS marketing_subaccount_code TEXT;

-- 2. Add margin_override_allowed to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS margin_override_allowed BOOLEAN DEFAULT FALSE;

-- 3. Budget Calculator Function
CREATE OR REPLACE FUNCTION public.calculate_budget_limits(p_product_id UUID)
RETURNS TABLE (
  gross_profit NUMERIC,
  growth_budget_amount NUMERIC,
  marketing_budget_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_product RECORD;
  v_config RECORD;
  v_gross_profit NUMERIC;
BEGIN
  -- Get product price and cost
  SELECT price, cost_price INTO v_product FROM public.products WHERE id = p_product_id;
  
  -- Get active split config
  SELECT growth_percentage, marketing_percentage INTO v_config 
  FROM public.profit_split_config 
  WHERE is_active = true 
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no config exists, use defaults
  IF v_config.growth_percentage IS NULL THEN
    v_config.growth_percentage := 25;
  END IF;
  IF v_config.marketing_percentage IS NULL THEN
    v_config.marketing_percentage := 15;
  END IF;

  -- Calculate gross profit (price - cost)
  v_gross_profit := v_product.price - COALESCE(v_product.cost_price, 0);
  
  -- Return the budget limits
  RETURN QUERY SELECT
    ROUND(v_gross_profit, 2),
    ROUND(v_gross_profit * (v_config.growth_percentage / 100.0), 2),
    ROUND(v_gross_profit * (v_config.marketing_percentage / 100.0), 2);
END;
$$;

-- 4. Grant execute permission
GRANT EXECUTE ON FUNCTION public.calculate_budget_limits(UUID) TO authenticated;

-- 5. Comment on new columns
COMMENT ON COLUMN public.profit_split_config.capital_subaccount_code IS 'Paystack subaccount code for Capital (restocking) bucket';
COMMENT ON COLUMN public.profit_split_config.growth_subaccount_code IS 'Paystack subaccount code for Growth (discounts) bucket';
COMMENT ON COLUMN public.profit_split_config.admin_subaccount_code IS 'Paystack subaccount code for Admin (operations) bucket';
COMMENT ON COLUMN public.profit_split_config.marketing_subaccount_code IS 'Paystack subaccount code for Marketing (commissions) bucket';
COMMENT ON COLUMN public.products.margin_override_allowed IS 'When true, allows saving products with margins below 10%';