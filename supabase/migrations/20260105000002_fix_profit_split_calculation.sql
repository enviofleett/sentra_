-- Migration: Fix Profit Split Calculation
-- Phase 2: Convert from revenue-based to profit-based allocation
-- This migration adds proper profit tracking and creates new calculation function

-- ============================================================================
-- PART 1: Add new fields to profit_allocations table
-- ============================================================================

ALTER TABLE public.profit_allocations
ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gross_profit NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS calculation_method TEXT DEFAULT 'revenue_based'
  CHECK (calculation_method IN ('revenue_based', 'profit_based'));

COMMENT ON COLUMN public.profit_allocations.total_cost IS 'Total cost of goods sold for this order (sum of cost_price_at_sale * quantity)';
COMMENT ON COLUMN public.profit_allocations.gross_profit IS 'Actual gross profit (total_amount - total_cost)';
COMMENT ON COLUMN public.profit_allocations.calculation_method IS 'Method used: revenue_based (legacy) or profit_based (new)';

-- Create index for filtering by calculation method
CREATE INDEX IF NOT EXISTS idx_profit_allocations_calculation_method
  ON public.profit_allocations(calculation_method);

-- ============================================================================
-- PART 2: Create new profit-based split calculation function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_profit_split_v2(
  p_order_id UUID,
  p_commitment_id UUID DEFAULT NULL,
  p_payment_reference TEXT DEFAULT NULL,
  p_total_revenue NUMERIC DEFAULT 0,
  p_total_cost NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_gross_profit NUMERIC;
  v_allocation_id UUID;
  v_capital_amount NUMERIC;
  v_admin_amount NUMERIC;
  v_growth_amount NUMERIC;
  v_marketing_amount NUMERIC;
BEGIN
  -- Validate inputs
  IF p_total_revenue <= 0 THEN
    RAISE EXCEPTION 'Total revenue must be greater than 0';
  END IF;

  IF p_total_cost < 0 THEN
    RAISE EXCEPTION 'Total cost cannot be negative';
  END IF;

  -- Calculate actual gross profit
  v_gross_profit := p_total_revenue - p_total_cost;

  -- Get active split configuration
  SELECT * INTO v_config
  FROM public.profit_split_config
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no config found, raise error
  IF v_config IS NULL THEN
    RAISE EXCEPTION 'No active profit split configuration found';
  END IF;

  -- Calculate allocations using PROFIT-based split
  -- Capital: Cost recovery + profit share
  v_capital_amount := p_total_cost + ROUND(v_gross_profit * v_config.capital_percentage / 100, 2);

  -- Other buckets: Profit share only
  v_admin_amount := ROUND(v_gross_profit * v_config.admin_percentage / 100, 2);
  v_growth_amount := ROUND(v_gross_profit * v_config.growth_percentage / 100, 2);
  v_marketing_amount := ROUND(v_gross_profit * v_config.marketing_percentage / 100, 2);

  -- Insert allocation record
  INSERT INTO public.profit_allocations (
    order_id,
    commitment_id,
    payment_reference,
    total_amount,
    total_cost,
    gross_profit,
    capital_amount,
    admin_amount,
    growth_amount,
    marketing_amount,
    split_config_id,
    calculation_method,
    created_at
  ) VALUES (
    p_order_id,
    p_commitment_id,
    p_payment_reference,
    p_total_revenue,
    p_total_cost,
    v_gross_profit,
    v_capital_amount,
    v_admin_amount,
    v_growth_amount,
    v_marketing_amount,
    v_config.id,
    'profit_based',
    NOW()
  )
  RETURNING id INTO v_allocation_id;

  RETURN v_allocation_id;
END;
$$;

COMMENT ON FUNCTION public.record_profit_split_v2 IS 'Profit-based allocation: Capital gets cost recovery + profit share, others get profit share only';

-- ============================================================================
-- PART 3: Update legacy function to mark calculation method
-- ============================================================================

-- Rename original function for clarity
DROP FUNCTION IF EXISTS public.record_profit_split(UUID, UUID, TEXT, NUMERIC);

CREATE OR REPLACE FUNCTION public.record_profit_split_legacy(
  p_order_id UUID,
  p_commitment_id UUID DEFAULT NULL,
  p_payment_reference TEXT DEFAULT NULL,
  p_total_amount NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_allocation_id UUID;
BEGIN
  -- Get active split configuration
  SELECT * INTO v_config
  FROM public.profit_split_config
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_config IS NULL THEN
    RAISE EXCEPTION 'No active profit split configuration found';
  END IF;

  -- Insert allocation using REVENUE-based split (legacy method)
  INSERT INTO public.profit_allocations (
    order_id,
    commitment_id,
    payment_reference,
    total_amount,
    total_cost,
    gross_profit,
    capital_amount,
    admin_amount,
    growth_amount,
    marketing_amount,
    split_config_id,
    calculation_method,
    created_at
  ) VALUES (
    p_order_id,
    p_commitment_id,
    p_payment_reference,
    p_total_amount,
    NULL,  -- No cost data
    NULL,  -- No profit calculation
    ROUND(p_total_amount * v_config.capital_percentage / 100, 2),
    ROUND(p_total_amount * v_config.admin_percentage / 100, 2),
    ROUND(p_total_amount * v_config.growth_percentage / 100, 2),
    ROUND(p_total_amount * v_config.marketing_percentage / 100, 2),
    v_config.id,
    'revenue_based',
    NOW()
  )
  RETURNING id INTO v_allocation_id;

  RETURN v_allocation_id;
END;
$$;

COMMENT ON FUNCTION public.record_profit_split_legacy IS 'Legacy revenue-based allocation (deprecated). Use record_profit_split_v2 for new orders.';

-- ============================================================================
-- PART 4: Create helper function to calculate order costs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_order_total_cost(p_order_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total_cost NUMERIC;
BEGIN
  -- Sum up cost_price_at_sale * quantity for all items in the order
  SELECT COALESCE(SUM(oi.quantity * COALESCE(oi.cost_price_at_sale, 0)), 0)
  INTO v_total_cost
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id;

  RETURN v_total_cost;
END;
$$;

COMMENT ON FUNCTION public.calculate_order_total_cost IS 'Calculates total cost of goods sold for an order based on order_items.cost_price_at_sale';

-- ============================================================================
-- PART 5: Create smart wrapper function that auto-selects calculation method
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_profit_split(
  p_order_id UUID,
  p_commitment_id UUID DEFAULT NULL,
  p_payment_reference TEXT DEFAULT NULL,
  p_total_amount NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_cost NUMERIC;
  v_allocation_id UUID;
BEGIN
  -- Calculate total cost from order items
  v_total_cost := public.calculate_order_total_cost(p_order_id);

  -- Use profit-based calculation if we have cost data, otherwise fall back to revenue-based
  IF v_total_cost > 0 THEN
    -- We have cost data - use new profit-based method
    v_allocation_id := public.record_profit_split_v2(
      p_order_id := p_order_id,
      p_commitment_id := p_commitment_id,
      p_payment_reference := p_payment_reference,
      p_total_revenue := p_total_amount,
      p_total_cost := v_total_cost
    );
  ELSE
    -- No cost data available - use legacy revenue-based method
    v_allocation_id := public.record_profit_split_legacy(
      p_order_id := p_order_id,
      p_commitment_id := p_commitment_id,
      p_payment_reference := p_payment_reference,
      p_total_amount := p_total_amount
    );
  END IF;

  RETURN v_allocation_id;
END;
$$;

COMMENT ON FUNCTION public.record_profit_split IS 'Smart wrapper: Uses profit-based calculation when cost data available, otherwise falls back to revenue-based';

-- ============================================================================
-- PART 6: Create updated view for profit bucket totals
-- ============================================================================

-- Drop old view and recreate with new fields
DROP VIEW IF EXISTS public.profit_bucket_totals;

CREATE OR REPLACE VIEW public.profit_bucket_totals AS
SELECT
  -- Overall totals
  COUNT(*) as transaction_count,
  SUM(total_amount) as total_revenue,
  SUM(total_cost) as total_costs,
  SUM(gross_profit) as total_gross_profit,

  -- Average margin
  CASE
    WHEN SUM(total_amount) > 0
    THEN ROUND((SUM(gross_profit) / SUM(total_amount) * 100), 2)
    ELSE NULL
  END as avg_margin_percentage,

  -- Bucket allocations
  SUM(capital_amount) as total_capital,
  SUM(admin_amount) as total_admin,
  SUM(growth_amount) as total_growth,
  SUM(marketing_amount) as total_marketing,

  -- Breakdown by calculation method
  SUM(CASE WHEN calculation_method = 'profit_based' THEN 1 ELSE 0 END) as profit_based_count,
  SUM(CASE WHEN calculation_method = 'revenue_based' THEN 1 ELSE 0 END) as revenue_based_count,

  -- Profit-based totals
  SUM(CASE WHEN calculation_method = 'profit_based' THEN total_amount ELSE 0 END) as profit_based_revenue,
  SUM(CASE WHEN calculation_method = 'profit_based' THEN gross_profit ELSE 0 END) as profit_based_gross_profit,

  -- Revenue-based totals (legacy)
  SUM(CASE WHEN calculation_method = 'revenue_based' THEN total_amount ELSE 0 END) as revenue_based_total

FROM public.profit_allocations;

COMMENT ON VIEW public.profit_bucket_totals IS 'Aggregated profit allocation totals with breakdown by calculation method';

-- ============================================================================
-- PART 7: Create view for profit vs revenue comparison
-- ============================================================================

CREATE OR REPLACE VIEW public.profit_split_comparison AS
SELECT
  pa.id,
  pa.order_id,
  pa.payment_reference,
  pa.total_amount as revenue,
  pa.total_cost as cost,
  pa.gross_profit as profit,
  pa.calculation_method,

  -- Show what allocations WOULD BE under each method
  -- Revenue-based (what it was)
  ROUND(pa.total_amount * 0.40, 2) as revenue_based_capital,
  ROUND(pa.total_amount * 0.20, 2) as revenue_based_admin,
  ROUND(pa.total_amount * 0.25, 2) as revenue_based_growth,
  ROUND(pa.total_amount * 0.15, 2) as revenue_based_marketing,

  -- Actual allocations (profit-based if cost data available)
  pa.capital_amount as actual_capital,
  pa.admin_amount as actual_admin,
  pa.growth_amount as actual_growth,
  pa.marketing_amount as actual_marketing,

  -- Difference (how much the new method changes things)
  pa.capital_amount - ROUND(pa.total_amount * 0.40, 2) as capital_difference,
  pa.admin_amount - ROUND(pa.total_amount * 0.20, 2) as admin_difference,
  pa.growth_amount - ROUND(pa.total_amount * 0.25, 2) as growth_difference,
  pa.marketing_amount - ROUND(pa.total_amount * 0.15, 2) as marketing_difference,

  pa.created_at
FROM public.profit_allocations pa;

COMMENT ON VIEW public.profit_split_comparison IS 'Compare revenue-based vs profit-based allocation methods side-by-side';

-- ============================================================================
-- PART 8: Grant permissions
-- ============================================================================

GRANT SELECT ON public.profit_bucket_totals TO authenticated;
GRANT SELECT ON public.profit_split_comparison TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_profit_split_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_profit_split_legacy TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_profit_split TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_order_total_cost TO authenticated;
