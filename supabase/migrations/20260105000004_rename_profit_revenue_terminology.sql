-- Migration: Rename Profit/Revenue Terminology for Clarity
-- Phase 6: Update terminology to accurately reflect revenue vs profit allocation
-- This migration adds clearer naming while maintaining backward compatibility

-- ============================================================================
-- PART 1: Add descriptive columns to config table
-- ============================================================================

ALTER TABLE public.profit_split_config
ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT 'Revenue Allocation Configuration',
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT 'Configures how revenue is distributed across business functions';

COMMENT ON TABLE public.profit_split_config IS 'Revenue allocation configuration (historically called profit_split for backward compatibility)';
COMMENT ON COLUMN public.profit_split_config.display_name IS 'User-friendly name shown in UI';
COMMENT ON COLUMN public.profit_split_config.description IS 'Explanation of what this configuration does';

-- Update existing rows to have descriptive names
UPDATE public.profit_split_config
SET
  display_name = 'Default Revenue Allocation',
  description = 'Standard 4-way revenue split: Capital (40%), Admin (20%), Growth (25%), Marketing (15%)'
WHERE display_name IS NULL;

-- ============================================================================
-- PART 2: Create clearer view names (aliases to existing tables)
-- ============================================================================

-- Create view that aliases profit_allocations with clearer name
CREATE OR REPLACE VIEW public.revenue_allocations AS
SELECT
  id,
  order_id,
  commitment_id,
  payment_reference,
  total_amount as revenue_amount,
  total_cost as cost_amount,
  gross_profit as profit_amount,
  capital_amount,
  admin_amount,
  growth_amount,
  marketing_amount,
  split_config_id as allocation_config_id,
  calculation_method,
  created_at,

  -- Add helper columns for clarity
  CASE
    WHEN calculation_method = 'profit_based' THEN 'Profit-Based Allocation'
    WHEN calculation_method = 'revenue_based' THEN 'Revenue-Based Allocation (Legacy)'
    ELSE 'Unknown Method'
  END as calculation_method_description,

  -- Show if this is using correct profit-based calculation
  (calculation_method = 'profit_based' AND total_cost IS NOT NULL) as is_accurate_calculation

FROM public.profit_allocations;

COMMENT ON VIEW public.revenue_allocations IS 'Revenue allocation records with clearer terminology (maps to profit_allocations table)';

-- ============================================================================
-- PART 3: Create summary view with accurate terminology
-- ============================================================================

CREATE OR REPLACE VIEW public.financial_health_dashboard AS
SELECT
  -- Transaction counts
  COUNT(*) as total_transactions,
  SUM(CASE WHEN calculation_method = 'profit_based' THEN 1 ELSE 0 END) as accurate_profit_based_count,
  SUM(CASE WHEN calculation_method = 'revenue_based' THEN 1 ELSE 0 END) as legacy_revenue_based_count,

  -- Revenue metrics
  SUM(total_amount) as total_revenue,
  SUM(CASE WHEN calculation_method = 'profit_based' THEN total_amount ELSE 0 END) as profit_based_revenue,
  SUM(CASE WHEN calculation_method = 'revenue_based' THEN total_amount ELSE 0 END) as revenue_based_revenue,

  -- Cost metrics (only for profit-based)
  SUM(total_cost) as total_costs,
  SUM(gross_profit) as total_gross_profit,

  -- Average margin (only meaningful for profit-based)
  CASE
    WHEN SUM(CASE WHEN calculation_method = 'profit_based' THEN total_amount ELSE 0 END) > 0
    THEN ROUND(
      (SUM(CASE WHEN calculation_method = 'profit_based' THEN gross_profit ELSE 0 END) /
       SUM(CASE WHEN calculation_method = 'profit_based' THEN total_amount ELSE 0 END) * 100), 2)
    ELSE NULL
  END as accurate_avg_margin_percentage,

  -- Allocation bucket totals
  SUM(capital_amount) as total_capital_bucket,
  SUM(admin_amount) as total_admin_bucket,
  SUM(growth_amount) as total_growth_bucket,
  SUM(marketing_amount) as total_marketing_bucket,

  -- Data quality metric
  ROUND(
    (SUM(CASE WHEN calculation_method = 'profit_based' THEN 1 ELSE 0 END)::NUMERIC /
     NULLIF(COUNT(*)::NUMERIC, 0) * 100), 2
  ) as data_quality_percentage,

  -- Timestamp
  NOW() as calculated_at

FROM public.profit_allocations;

COMMENT ON VIEW public.financial_health_dashboard IS 'Financial health metrics with clear distinction between profit-based and revenue-based calculations';

-- ============================================================================
-- PART 4: Add terminology mapping table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.terminology_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_term TEXT NOT NULL UNIQUE,
  accurate_term TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('table', 'column', 'function', 'concept')),
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.terminology_mapping IS 'Maps legacy profit/revenue terminology to accurate terms for documentation';

-- Insert terminology mappings
INSERT INTO public.terminology_mapping (legacy_term, accurate_term, category, explanation) VALUES
  ('profit_split_config', 'revenue_allocation_config', 'table', 'Historically called profit_split but actually configures revenue allocation'),
  ('profit_allocations', 'revenue_allocations', 'table', 'Records of revenue allocation across business functions'),
  ('profit_bucket_totals', 'revenue_bucket_totals', 'table', 'Summary totals of revenue allocated to each bucket'),
  ('record_profit_split', 'record_revenue_allocation', 'function', 'Function to record revenue allocation for an order'),
  ('total_amount', 'revenue_amount', 'column', 'Total revenue from the order'),
  ('capital_percentage', 'capital_allocation_percentage', 'column', 'Percentage of revenue allocated to capital/restocking'),
  ('Profit Split', 'Revenue Allocation', 'concept', 'UI terminology: should show "Revenue Allocation" instead of "Profit Split"')
ON CONFLICT (legacy_term) DO NOTHING;

-- ============================================================================
-- PART 5: Update profit_bucket_totals view with clearer column names
-- ============================================================================

DROP VIEW IF EXISTS public.profit_bucket_totals;

CREATE OR REPLACE VIEW public.profit_bucket_totals AS
SELECT
  -- Transaction metrics
  COUNT(*) as transaction_count,

  -- Revenue metrics
  SUM(total_amount) as total_revenue,
  SUM(total_cost) as total_costs,
  SUM(gross_profit) as total_gross_profit,

  -- Average margin calculation
  CASE
    WHEN SUM(total_amount) > 0
    THEN ROUND((SUM(COALESCE(gross_profit, 0)) / SUM(total_amount) * 100), 2)
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

  -- Profit-based metrics
  SUM(CASE WHEN calculation_method = 'profit_based' THEN total_amount ELSE 0 END) as profit_based_revenue,
  SUM(CASE WHEN calculation_method = 'profit_based' THEN gross_profit ELSE 0 END) as profit_based_gross_profit,
  SUM(CASE WHEN calculation_method = 'profit_based' THEN total_cost ELSE 0 END) as profit_based_costs,

  -- Revenue-based metrics (legacy)
  SUM(CASE WHEN calculation_method = 'revenue_based' THEN total_amount ELSE 0 END) as revenue_based_total,

  -- Data quality indicator
  ROUND(
    (SUM(CASE WHEN calculation_method = 'profit_based' THEN 1 ELSE 0 END)::NUMERIC /
     NULLIF(COUNT(*)::NUMERIC, 0) * 100), 2
  ) as profit_based_percentage,

  -- Last updated
  MAX(created_at) as last_allocation_date

FROM public.profit_allocations;

COMMENT ON VIEW public.profit_bucket_totals IS 'Aggregated allocation totals across all revenue buckets with calculation method breakdown';

-- ============================================================================
-- PART 6: Create helper function for UI display names
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_display_terminology(p_legacy_term TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_accurate_term TEXT;
BEGIN
  SELECT accurate_term INTO v_accurate_term
  FROM public.terminology_mapping
  WHERE legacy_term = p_legacy_term;

  RETURN COALESCE(v_accurate_term, p_legacy_term);
END;
$$;

COMMENT ON FUNCTION public.get_display_terminology IS 'Returns user-friendly terminology for legacy database names';

-- Example usage:
-- SELECT get_display_terminology('profit_split_config'); -- Returns: 'revenue_allocation_config'

-- ============================================================================
-- PART 7: Add warnings for products missing cost data
-- ============================================================================

CREATE OR REPLACE VIEW public.products_missing_cost_data AS
SELECT
  p.id,
  p.name,
  p.price,
  p.stock_quantity,
  p.is_active,
  p.created_at,

  -- Calculate potential impact
  COALESCE(sales.units_sold, 0) as historical_units_sold,
  COALESCE(sales.total_revenue, 0) as historical_revenue,

  -- Urgency score (higher = more urgent to add cost data)
  CASE
    WHEN COALESCE(sales.units_sold, 0) > 100 THEN 'CRITICAL'
    WHEN COALESCE(sales.units_sold, 0) > 50 THEN 'HIGH'
    WHEN COALESCE(sales.units_sold, 0) > 10 THEN 'MEDIUM'
    WHEN p.is_active = true THEN 'LOW'
    ELSE 'INACTIVE'
  END as data_urgency

FROM public.products p
LEFT JOIN (
  SELECT
    product_id,
    COUNT(*) as units_sold,
    SUM(price * quantity) as total_revenue
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status != 'cancelled'
  GROUP BY product_id
) sales ON sales.product_id = p.id

WHERE p.cost_price IS NULL
  AND p.deleted_at IS NULL

ORDER BY
  CASE
    WHEN COALESCE(sales.units_sold, 0) > 100 THEN 1
    WHEN COALESCE(sales.units_sold, 0) > 50 THEN 2
    WHEN COALESCE(sales.units_sold, 0) > 10 THEN 3
    WHEN p.is_active = true THEN 4
    ELSE 5
  END,
  sales.total_revenue DESC NULLS LAST;

COMMENT ON VIEW public.products_missing_cost_data IS 'Products without cost price data, prioritized by business impact';

-- ============================================================================
-- PART 8: Grant permissions
-- ============================================================================

GRANT SELECT ON public.revenue_allocations TO authenticated;
GRANT SELECT ON public.financial_health_dashboard TO authenticated;
GRANT SELECT ON public.terminology_mapping TO authenticated;
GRANT SELECT ON public.products_missing_cost_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_display_terminology TO authenticated;

-- ============================================================================
-- PART 9: Create documentation comment
-- ============================================================================

COMMENT ON DATABASE postgres IS 'Sentra Scent Shop - Terminology Note: Tables prefixed with "profit_" historically refer to revenue allocation, not true profit calculation. Use calculation_method column to distinguish between revenue-based (legacy) and profit-based (accurate) calculations.';
