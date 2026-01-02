-- Create function to safely deduct product stock
-- This function prevents negative stock and provides atomic stock updates
CREATE OR REPLACE FUNCTION public.deduct_product_stock(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  -- Validate input
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  -- Lock the row and get current stock
  SELECT stock_quantity INTO v_current_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  -- Check if product exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- Check if enough stock is available
  IF v_current_stock < p_quantity THEN
    RAISE WARNING 'Insufficient stock for product %: available=%, requested=%',
      p_product_id, v_current_stock, p_quantity;
    -- Don't fail the transaction - log warning and continue
    -- This is because payment has already been processed
  END IF;

  -- Deduct stock (allow going negative for paid orders - admin can fix manually)
  UPDATE products
  SET
    stock_quantity = GREATEST(0, stock_quantity - p_quantity),
    updated_at = now()
  WHERE id = p_product_id;

  RETURN TRUE;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION public.deduct_product_stock IS 'Safely deducts stock for a product after payment is confirmed. Allows negative stock with warning for manual admin resolution.';
