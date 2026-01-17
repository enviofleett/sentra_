-- Phase 1: Create trigger to enforce cost price on activation
CREATE OR REPLACE FUNCTION validate_product_cost_price()
RETURNS TRIGGER AS $$
BEGIN
  -- If product is being activated and has no cost_price, prevent activation
  IF NEW.is_active = true AND NEW.cost_price IS NULL THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_cost_price_on_activation ON products;
CREATE TRIGGER enforce_cost_price_on_activation
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_cost_price();

-- Phase 2: Deactivate all existing products without cost price
UPDATE products 
SET is_active = false, updated_at = now()
WHERE cost_price IS NULL AND is_active = true;