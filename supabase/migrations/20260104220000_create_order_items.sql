-- Create order_items table to normalize order data and support analytics
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own order items"
  ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items"
  ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to sync order items from orders.items JSONB
CREATE OR REPLACE FUNCTION public.sync_order_items()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.order_items (order_id, product_id, quantity, price)
  SELECT
    NEW.id,
    (item->>'product_id')::UUID,
    (item->>'quantity')::INTEGER,
    (item->>'price')::DECIMAL
  FROM jsonb_array_elements(NEW.items) AS item;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to populate order_items when an order is created
DROP TRIGGER IF EXISTS on_order_created_sync_items ON public.orders;
CREATE TRIGGER on_order_created_sync_items
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_items();
