-- Migration: Add Margin Safeguards and Validation
-- Phase 3: Prevent pricing below cost and enforce minimum margins
-- This migration adds database-level constraints and validation triggers

-- ============================================================================
-- PART 1: Add margin override tracking
-- ============================================================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS margin_override_allowed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS margin_override_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS margin_override_approved_by UUID REFERENCES auth.users(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS margin_override_approved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.products.margin_override_allowed IS 'Whether this product is allowed to have margins below the minimum threshold';
COMMENT ON COLUMN public.products.margin_override_reason IS 'Business justification for low margin (e.g., "Loss leader", "Clearance sale")';
COMMENT ON COLUMN public.products.margin_override_approved_by IS 'Admin user who approved the low margin';
COMMENT ON COLUMN public.products.margin_override_approved_at IS 'Timestamp when low margin was approved';

-- ============================================================================
-- PART 2: Create margin validation function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_product_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_margin_percentage NUMERIC;
  v_min_margin_percentage NUMERIC := 10.00;  -- Minimum 10% margin required
  v_recommended_margin NUMERIC := 20.00;      -- Recommended 20% margin
BEGIN
  -- Only validate if cost_price is set
  IF NEW.cost_price IS NOT NULL AND NEW.cost_price > 0 THEN

    -- Calculate margin percentage
    v_margin_percentage := ((NEW.price - NEW.cost_price) / NEW.price) * 100;

    -- CRITICAL: Prevent selling at or below cost
    IF NEW.price <= NEW.cost_price THEN
      RAISE EXCEPTION 'CRITICAL: Selling price (%) cannot be at or below cost price (%). This would result in a loss.',
        NEW.price, NEW.cost_price;
    END IF;

    -- Check if margin is below minimum threshold
    IF v_margin_percentage < v_min_margin_percentage THEN
      -- Check if override is allowed
      IF NEW.margin_override_allowed = TRUE AND NEW.margin_override_reason IS NOT NULL THEN
        -- Override approved - allow but log warning
        RAISE NOTICE 'WARNING: Product "%" has low margin (%%): % (Reason: %)',
          NEW.name, v_margin_percentage, NEW.margin_override_reason;
      ELSE
        -- No override - reject
        RAISE EXCEPTION 'Margin too low: %.2f%%. Minimum %.2f%% required. Cost: %, Price: %. To override, set margin_override_allowed=true and provide margin_override_reason.',
          v_margin_percentage, v_min_margin_percentage, NEW.cost_price, NEW.price;
      END IF;
    END IF;

    -- Warning for below recommended margin (non-blocking)
    IF v_margin_percentage < v_recommended_margin AND v_margin_percentage >= v_min_margin_percentage THEN
      RAISE NOTICE 'NOTICE: Product "%" margin (%.2f%%) is below recommended %.2f%%',
        NEW.name, v_margin_percentage, v_recommended_margin;
    END IF;

  END IF;

  -- Validate original_price if set
  IF NEW.original_price IS NOT NULL THEN
    IF NEW.original_price <= NEW.price THEN
      RAISE EXCEPTION 'Original price (%) must be higher than current price (%) to show as discount',
        NEW.original_price, NEW.price;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_product_pricing IS 'Validates product pricing to ensure minimum margins and prevent losses';

-- ============================================================================
-- PART 3: Apply pricing validation trigger to products
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_validate_product_pricing ON public.products;

CREATE TRIGGER trigger_validate_product_pricing
  BEFORE INSERT OR UPDATE OF price, cost_price, original_price, margin_override_allowed
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_product_pricing();

-- ============================================================================
-- PART 4: Create validation for group buy campaigns
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_group_buy_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_product RECORD;
  v_margin_percentage NUMERIC;
  v_min_margin_percentage NUMERIC := 5.00;  -- Allow lower margin for group buys (5%)
BEGIN
  -- Get product details including cost price
  SELECT
    p.id,
    p.name,
    p.cost_price,
    p.price,
    p.margin_override_allowed
  INTO v_product
  FROM public.products p
  WHERE p.id = NEW.product_id;

  -- Only validate if product has cost price
  IF v_product.cost_price IS NOT NULL AND v_product.cost_price > 0 THEN

    -- Check if discount price is at or below cost
    IF NEW.discount_price <= v_product.cost_price THEN
      RAISE EXCEPTION 'Group buy discount price (%) cannot be at or below product cost (%). Product: %',
        NEW.discount_price, v_product.cost_price, v_product.name;
    END IF;

    -- Calculate margin at discount price
    v_margin_percentage := ((NEW.discount_price - v_product.cost_price) / NEW.discount_price) * 100;

    -- Check minimum margin for group buys
    IF v_margin_percentage < v_min_margin_percentage THEN
      IF v_product.margin_override_allowed = TRUE THEN
        RAISE NOTICE 'WARNING: Group buy for "%" has very low margin: %.2f%%',
          v_product.name, v_margin_percentage;
      ELSE
        RAISE EXCEPTION 'Group buy discount too steep: %.2f%% margin. Minimum %.2f%% required. Discount price: %, Cost: %',
          v_margin_percentage, v_min_margin_percentage, NEW.discount_price, v_product.cost_price;
      END IF;
    END IF;

  END IF;

  -- Ensure discount price is lower than regular price
  IF NEW.discount_price >= v_product.price THEN
    RAISE EXCEPTION 'Group buy discount price (%) must be lower than regular price (%)',
      NEW.discount_price, v_product.price;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_group_buy_pricing IS 'Validates group buy discount pricing to ensure minimum 5% margin';

-- ============================================================================
-- PART 5: Apply group buy pricing validation trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_validate_group_buy_pricing ON public.group_buy_campaigns;

CREATE TRIGGER trigger_validate_group_buy_pricing
  BEFORE INSERT OR UPDATE OF discount_price, product_id
  ON public.group_buy_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_group_buy_pricing();

-- ============================================================================
-- PART 6: Create function to validate stacked discounts
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_effective_margin(
  p_product_id UUID,
  p_reseller_discount_pct NUMERIC DEFAULT 0,
  p_affiliate_commission_pct NUMERIC DEFAULT 0,
  p_base_price NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  selling_price NUMERIC,
  cost_price NUMERIC,
  gross_revenue NUMERIC,
  affiliate_commission NUMERIC,
  net_revenue NUMERIC,
  total_cost NUMERIC,
  net_profit NUMERIC,
  margin_percentage NUMERIC,
  is_profitable BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_product RECORD;
  v_final_price NUMERIC;
  v_commission NUMERIC;
  v_net_revenue NUMERIC;
  v_net_profit NUMERIC;
  v_margin_pct NUMERIC;
BEGIN
  -- Get product details
  SELECT p.id, p.name, p.price, p.cost_price
  INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id;

  IF v_product IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- Use provided base price or product price
  v_final_price := COALESCE(p_base_price, v_product.price);

  -- Apply reseller discount to selling price
  v_final_price := v_final_price * (1 - p_reseller_discount_pct / 100);

  -- Calculate affiliate commission on final selling price
  v_commission := v_final_price * p_affiliate_commission_pct / 100;

  -- Calculate net revenue after commission
  v_net_revenue := v_final_price - v_commission;

  -- Calculate net profit
  IF v_product.cost_price IS NOT NULL THEN
    v_net_profit := v_net_revenue - v_product.cost_price;
    v_margin_pct := (v_net_profit / v_final_price) * 100;
  ELSE
    v_net_profit := NULL;
    v_margin_pct := NULL;
  END IF;

  -- Return calculated values
  RETURN QUERY SELECT
    v_final_price,                                          -- selling_price
    v_product.cost_price,                                   -- cost_price
    v_final_price,                                          -- gross_revenue
    v_commission,                                           -- affiliate_commission
    v_net_revenue,                                          -- net_revenue
    v_product.cost_price,                                   -- total_cost
    v_net_profit,                                           -- net_profit
    v_margin_pct,                                           -- margin_percentage
    (v_net_profit > 0)                                      -- is_profitable
  ;
END;
$$;

COMMENT ON FUNCTION public.calculate_effective_margin IS 'Calculates effective margin after stacking reseller discounts and affiliate commissions';

-- ============================================================================
-- PART 7: Create view for products at risk
-- ============================================================================

CREATE OR REPLACE VIEW public.products_at_risk AS
SELECT
  p.id,
  p.name,
  p.price,
  p.cost_price,
  p.target_margin_percentage,
  pp.actual_margin_percentage,
  pp.margin_status,

  -- Flag various risk levels
  CASE
    WHEN p.cost_price IS NULL THEN 'MISSING_COST_DATA'
    WHEN pp.actual_margin_percentage < 10 THEN 'CRITICAL'
    WHEN pp.actual_margin_percentage < 20 THEN 'WARNING'
    WHEN pp.actual_margin_percentage < p.target_margin_percentage THEN 'BELOW_TARGET'
    ELSE 'HEALTHY'
  END as risk_level,

  -- Calculate safe discount limits
  CASE
    WHEN p.cost_price IS NOT NULL
    THEN ROUND(((p.price - (p.cost_price * 1.10)) / p.price * 100), 2)
    ELSE NULL
  END as max_safe_discount_percentage,

  -- Minimum price to maintain 10% margin
  CASE
    WHEN p.cost_price IS NOT NULL
    THEN ROUND(p.cost_price * 1.10, 2)
    ELSE NULL
  END as minimum_safe_price,

  p.margin_override_allowed,
  p.margin_override_reason,
  p.last_cost_updated_at,
  p.created_at

FROM public.products p
LEFT JOIN public.product_profitability pp ON pp.id = p.id
WHERE p.deleted_at IS NULL
ORDER BY
  CASE
    WHEN p.cost_price IS NULL THEN 1
    WHEN pp.actual_margin_percentage < 10 THEN 2
    WHEN pp.actual_margin_percentage < 20 THEN 3
    WHEN pp.actual_margin_percentage < p.target_margin_percentage THEN 4
    ELSE 5
  END,
  pp.actual_margin_percentage ASC NULLS FIRST;

COMMENT ON VIEW public.products_at_risk IS 'Products with missing cost data or margins below safe thresholds';

-- ============================================================================
-- PART 8: Create audit log table for pricing changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_pricing_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('price_change', 'cost_change', 'margin_override')),

  -- Old values
  old_price DECIMAL(10,2),
  old_cost_price DECIMAL(10,2),
  old_margin_percentage DECIMAL(5,2),

  -- New values
  new_price DECIMAL(10,2),
  new_cost_price DECIMAL(10,2),
  new_margin_percentage DECIMAL(5,2),

  -- Override details (if applicable)
  override_reason TEXT,
  override_approved BOOLEAN DEFAULT FALSE,

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_audit_product_id ON public.product_pricing_audit(product_id);
CREATE INDEX IF NOT EXISTS idx_pricing_audit_created_at ON public.product_pricing_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_audit_change_type ON public.product_pricing_audit(change_type);

COMMENT ON TABLE public.product_pricing_audit IS 'Audit trail for all product pricing and cost changes';

-- ============================================================================
-- PART 9: Create trigger to auto-log pricing changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_pricing_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_margin NUMERIC;
  v_new_margin NUMERIC;
  v_change_type TEXT;
BEGIN
  -- Calculate old margin
  IF OLD.cost_price IS NOT NULL AND OLD.price > 0 THEN
    v_old_margin := ((OLD.price - OLD.cost_price) / OLD.price) * 100;
  END IF;

  -- Calculate new margin
  IF NEW.cost_price IS NOT NULL AND NEW.price > 0 THEN
    v_new_margin := ((NEW.price - NEW.cost_price) / NEW.price) * 100;
  END IF;

  -- Determine change type
  IF OLD.price != NEW.price THEN
    v_change_type := 'price_change';
  ELSIF OLD.cost_price IS DISTINCT FROM NEW.cost_price THEN
    v_change_type := 'cost_change';
  ELSIF OLD.margin_override_allowed != NEW.margin_override_allowed THEN
    v_change_type := 'margin_override';
  ELSE
    RETURN NEW;  -- No relevant changes
  END IF;

  -- Log the change
  INSERT INTO public.product_pricing_audit (
    product_id,
    changed_by,
    change_type,
    old_price,
    old_cost_price,
    old_margin_percentage,
    new_price,
    new_cost_price,
    new_margin_percentage,
    override_reason,
    override_approved
  ) VALUES (
    NEW.id,
    auth.uid(),
    v_change_type,
    OLD.price,
    OLD.cost_price,
    v_old_margin,
    NEW.price,
    NEW.cost_price,
    v_new_margin,
    NEW.margin_override_reason,
    NEW.margin_override_allowed
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_pricing_changes ON public.products;

CREATE TRIGGER trigger_log_pricing_changes
  AFTER UPDATE OF price, cost_price, margin_override_allowed
  ON public.products
  FOR EACH ROW
  WHEN (
    OLD.price IS DISTINCT FROM NEW.price OR
    OLD.cost_price IS DISTINCT FROM NEW.cost_price OR
    OLD.margin_override_allowed IS DISTINCT FROM NEW.margin_override_allowed
  )
  EXECUTE FUNCTION public.log_pricing_changes();

-- ============================================================================
-- PART 10: Grant permissions
-- ============================================================================

GRANT SELECT ON public.products_at_risk TO authenticated;
GRANT SELECT ON public.product_pricing_audit TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_effective_margin TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_product_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_group_buy_pricing TO authenticated;
