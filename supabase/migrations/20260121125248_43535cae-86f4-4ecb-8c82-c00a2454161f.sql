-- Add Minimum Order Quantity column to vendors table (default to 1)
ALTER TABLE vendors 
ADD COLUMN min_order_quantity INTEGER NOT NULL DEFAULT 1;

-- Add a comment for documentation
COMMENT ON COLUMN vendors.min_order_quantity IS 'Minimum total items a customer must buy from this vendor to checkout';