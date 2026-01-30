-- Add cost_price column to products table
-- Commented out as it is already added in 20260105000001_add_cost_price_tracking.sql
-- ALTER TABLE public.products
-- ADD COLUMN cost_price numeric NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.products.cost_price IS 'Cost price for margin calculation. NULL means cost data not yet entered.';

-- Create products_at_risk view (products with low or negative margins)
DROP VIEW IF EXISTS public.products_at_risk;
CREATE OR REPLACE VIEW public.products_at_risk AS
SELECT 
  p.id,
  p.name,
  p.price,
  p.cost_price,
  p.stock_quantity,
  p.is_active,
  CASE 
    WHEN p.cost_price IS NULL THEN NULL
    ELSE p.price - p.cost_price 
  END AS margin_amount,
  CASE 
    WHEN p.cost_price IS NULL THEN NULL
    WHEN p.price = 0 THEN 0
    ELSE ROUND(((p.price - p.cost_price) / p.price * 100)::numeric, 2)
  END AS margin_percentage,
  CASE
    WHEN p.cost_price IS NULL THEN 'no_cost_data'
    WHEN p.price <= p.cost_price THEN 'negative_margin'
    WHEN ((p.price - p.cost_price) / NULLIF(p.price, 0) * 100) < 20 THEN 'low_margin'
    ELSE 'healthy'
  END AS risk_status
FROM public.products p
WHERE p.is_active = true
  AND (
    p.cost_price IS NULL 
    OR p.price <= p.cost_price 
    OR ((p.price - p.cost_price) / NULLIF(p.price, 0) * 100) < 20
  )
ORDER BY 
  CASE
    WHEN p.cost_price IS NULL THEN 2
    WHEN p.price <= p.cost_price THEN 0
    ELSE 1
  END,
  margin_percentage ASC NULLS LAST;

-- Create product_profitability_summary view (overall profitability metrics)
CREATE OR REPLACE VIEW public.product_profitability_summary AS
SELECT 
  COUNT(*) AS total_products,
  COUNT(cost_price) AS products_with_cost_data,
  ROUND((COUNT(cost_price)::numeric / NULLIF(COUNT(*), 0) * 100)::numeric, 1) AS cost_data_coverage_pct,
  COUNT(*) FILTER (WHERE cost_price IS NOT NULL AND price > cost_price) AS profitable_products,
  COUNT(*) FILTER (WHERE cost_price IS NOT NULL AND price <= cost_price) AS unprofitable_products,
  COUNT(*) FILTER (WHERE cost_price IS NOT NULL AND ((price - cost_price) / NULLIF(price, 0) * 100) < 20) AS low_margin_products,
  ROUND(AVG(CASE WHEN cost_price IS NOT NULL AND price > 0 THEN ((price - cost_price) / price * 100) END)::numeric, 2) AS avg_margin_percentage,
  SUM(CASE WHEN cost_price IS NOT NULL THEN price - cost_price ELSE 0 END) AS total_potential_margin,
  SUM(CASE WHEN cost_price IS NOT NULL THEN cost_price * stock_quantity ELSE 0 END) AS total_inventory_cost,
  SUM(price * stock_quantity) AS total_inventory_value
FROM public.products
WHERE is_active = true;