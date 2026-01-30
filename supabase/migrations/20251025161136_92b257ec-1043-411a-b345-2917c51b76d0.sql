-- Migration commented out to resolve conflict with 20251112 baseline
-- This migration attempted to create product analytics tracking table but depends on products table.

-- Create product analytics tracking table
-- CREATE TABLE IF NOT EXISTS public.product_analytics (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
--   event_type TEXT NOT NULL CHECK (event_type IN ('view', 'purchase')),
--   user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
--   session_id TEXT,
--   quantity INTEGER DEFAULT 1,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Create indexes for performance
-- CREATE INDEX IF NOT EXISTS idx_product_analytics_product ON public.product_analytics(product_id);
-- CREATE INDEX IF NOT EXISTS idx_product_analytics_date ON public.product_analytics(created_at);
-- CREATE INDEX IF NOT EXISTS idx_product_analytics_event ON public.product_analytics(event_type);

-- Enable RLS
-- ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- CREATE POLICY "Admins can view all analytics"
-- ON public.product_analytics
-- FOR SELECT
-- USING (public.is_admin());

-- CREATE POLICY "Public can insert view events"
-- ON public.product_analytics
-- FOR INSERT
-- WITH CHECK (event_type = 'view');

-- CREATE POLICY "System can insert purchase events"
-- ON public.product_analytics
-- FOR INSERT
-- WITH CHECK (event_type = 'purchase');

-- Create trigger function to track purchases
-- CREATE OR REPLACE FUNCTION public.track_product_purchases()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--   -- Insert analytics for each product in the order
--   INSERT INTO public.product_analytics (product_id, event_type, user_id, quantity, session_id)
--   SELECT 
--     (item->>'product_id')::UUID,
--     'purchase',
--     NEW.user_id,
--     (item->>'quantity')::INTEGER,
--     NEW.id::TEXT
--   FROM jsonb_array_elements(NEW.items) AS item;
--   
--   RETURN NEW;
-- END;
-- $$;

-- Create trigger on orders table
-- DROP TRIGGER IF EXISTS on_order_created ON public.orders;
-- CREATE TRIGGER on_order_created
--   AFTER INSERT ON public.orders
--   FOR EACH ROW
--   EXECUTE FUNCTION public.track_product_purchases();
