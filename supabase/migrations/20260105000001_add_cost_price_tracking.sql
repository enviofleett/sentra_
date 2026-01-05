-- Migration: Add Cost Price Tracking
-- Phase 1: Foundation for profit-based calculations
-- This migration adds cost price fields to products and order_items for accurate profit tracking

-- ============================================================================
-- PART 1: Add cost price fields to products table
-- ============================================================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS target_margin_percentage DECIMAL(5,2) DEFAULT 30.00,
ADD COLUMN IF NOT EXISTS last_cost_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comment documentation
COMMENT ON COLUMN public.products.cost_price IS 'Purchase/manufacturing cost per unit. Used for profit margin calculations.';
COMMENT ON COLUMN public.products.target_margin_percentage IS 'Target profit margin percentage for this product (default 30%)';
COMMENT ON COLUMN public.products.last_cost_updated_at IS 'Timestamp of last cost price update for tracking price changes';

-- ============================================================================
-- PART 2: Add cost price snapshot to order_items
-- ============================================================================

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS cost_price_at_sale DECIMAL(10,2) DEFAULT NULL;

COMMENT ON COLUMN public.order_items.cost_price_at_sale IS 'Snapshot of product cost price at time of sale for historical profit analysis';

-- ============================================================================
-- PART 3: Create function to auto-capture cost price on order creation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.capture_cost_price_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Automatically capture the current cost price when order item is created
  IF NEW.cost_price_at_sale IS NULL THEN
    SELECT cost_price INTO NEW.cost_price_at_sale
    FROM public.products
    WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger to order_items
DROP TRIGGER IF EXISTS trigger_capture_cost_price ON public.order_items;
CREATE TRIGGER trigger_capture_cost_price
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_cost_price_on_order();

-- ============================================================================
-- PART 4: Create view for product profitability analysis
-- ============================================================================

CREATE OR REPLACE VIEW public.product_profitability AS
SELECT
  p.id,
  p.name,
  p.price as selling_price,
  p.cost_price,
  p.target_margin_percentage,
  -- Calculate gross profit per unit
  CASE
    WHEN p.cost_price IS NOT NULL
    THEN (p.price - p.cost_price)
    ELSE NULL
  END as gross_profit_per_unit,
  -- Calculate actual margin percentage
  CASE
    WHEN p.cost_price IS NOT NULL AND p.price > 0
    THEN ROUND(((p.price - p.cost_price) / p.price * 100), 2)
    ELSE NULL
  END as actual_margin_percentage,
  -- Calculate margin gap (actual vs target)
  CASE
    WHEN p.cost_price IS NOT NULL AND p.price > 0
    THEN ROUND(((p.price - p.cost_price) / p.price * 100), 2) - p.target_margin_percentage
    ELSE NULL
  END as margin_gap,
  -- Status indicator
  CASE
    WHEN p.cost_price IS NULL THEN 'NO_COST_DATA'
    WHEN p.price <= p.cost_price THEN 'LOSS'
    WHEN ((p.price - p.cost_price) / p.price * 100) < 10 THEN 'CRITICAL_LOW'
    WHEN ((p.price - p.cost_price) / p.price * 100) < 20 THEN 'LOW_MARGIN'
    WHEN ((p.price - p.cost_price) / p.price * 100) >= p.target_margin_percentage THEN 'HEALTHY'
    ELSE 'BELOW_TARGET'
  END as margin_status,
  p.last_cost_updated_at,
  p.created_at,
  p.updated_at
FROM public.products p
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW public.product_profitability IS 'Real-time product profitability analysis with margin calculations and health indicators';

-- ============================================================================
-- PART 5: Create function to update cost price with audit trail
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_product_cost_price(
  p_product_id UUID,
  p_new_cost_price DECIMAL(10,2)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the cost price and timestamp
  UPDATE public.products
  SET
    cost_price = p_new_cost_price,
    last_cost_updated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_product_id;

  -- Log the change (if audit table exists)
  -- This allows tracking cost price history over time
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_cost_history') THEN
    INSERT INTO public.product_cost_history (product_id, cost_price, changed_at)
    VALUES (p_product_id, p_new_cost_price, NOW());
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_product_cost_price IS 'Updates product cost price with automatic timestamp tracking';

-- ============================================================================
-- PART 6: Grant necessary permissions
-- ============================================================================

-- Grant SELECT on the new view to authenticated users
GRANT SELECT ON public.product_profitability TO authenticated;

-- Grant EXECUTE on the update function to authenticated users (admin role check should be in RLS)
GRANT EXECUTE ON FUNCTION public.update_product_cost_price TO authenticated;
GRANT EXECUTE ON FUNCTION public.capture_cost_price_on_order TO authenticated;
