-- Migration commented out to resolve conflict with 20251112 baseline
-- This migration attempted to create group buy tables and alter products/orders.

-- Create new enums for group buy system
-- CREATE TYPE group_buy_status AS ENUM (
--   'pending',
--   'active',
--   'goal_met_pending_payment',
--   'goal_met_finalized',
--   'failed_expired',
--   'failed_cancelled'
-- );

-- CREATE TYPE commitment_status AS ENUM (
--   'committed_unpaid',
--   'committed_paid',
--   'payment_window_expired',
--   'refunded'
-- );

-- CREATE TYPE payment_mode AS ENUM (
--   'pay_to_book',
--   'pay_on_success'
-- );

-- Create group_buy_campaigns table
-- CREATE TABLE public.group_buy_campaigns (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
--   vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
--   goal_quantity INTEGER NOT NULL CHECK (goal_quantity > 0),
--   current_quantity INTEGER NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
--   discount_price NUMERIC NOT NULL CHECK (discount_price >= 0),
--   payment_mode payment_mode NOT NULL DEFAULT 'pay_on_success',
--   payment_window_hours INTEGER NOT NULL DEFAULT 6 CHECK (payment_window_hours > 0),
--   expiry_at TIMESTAMP WITH TIME ZONE NOT NULL,
--   status group_buy_status NOT NULL DEFAULT 'pending',
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
-- );

-- Create group_buy_commitments table
-- CREATE TABLE public.group_buy_commitments (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   campaign_id UUID NOT NULL REFERENCES public.group_buy_campaigns(id) ON DELETE CASCADE,
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
--   committed_price NUMERIC NOT NULL CHECK (committed_price >= 0),
--   payment_ref TEXT,
--   order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
--   payment_deadline TIMESTAMP WITH TIME ZONE,
--   status commitment_status NOT NULL DEFAULT 'committed_unpaid',
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
-- );

-- Add indexes for performance
-- CREATE INDEX idx_campaigns_status ON public.group_buy_campaigns(status);
-- CREATE INDEX idx_campaigns_expiry ON public.group_buy_campaigns(expiry_at);
-- CREATE INDEX idx_campaigns_product ON public.group_buy_campaigns(product_id);
-- CREATE INDEX idx_commitments_campaign ON public.group_buy_commitments(campaign_id);
-- CREATE INDEX idx_commitments_user ON public.group_buy_commitments(user_id);
-- CREATE INDEX idx_commitments_status ON public.group_buy_commitments(status);
-- CREATE INDEX idx_commitments_payment_deadline ON public.group_buy_commitments(payment_deadline);

-- Add trigger for updated_at
-- CREATE TRIGGER set_updated_at_campaigns
--   BEFORE UPDATE ON public.group_buy_campaigns
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_updated_at();

-- CREATE TRIGGER set_updated_at_commitments
--   BEFORE UPDATE ON public.group_buy_commitments
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_updated_at();

-- Add active_group_buy_id to products table
-- ALTER TABLE public.products 
-- ADD COLUMN active_group_buy_id UUID 
-- REFERENCES public.group_buy_campaigns(id) ON DELETE SET NULL;

-- CREATE INDEX idx_products_active_group_buy ON public.products(active_group_buy_id);

-- Add commitment_id to orders table
-- ALTER TABLE public.orders 
-- ADD COLUMN commitment_id UUID 
-- REFERENCES public.group_buy_commitments(id) ON DELETE SET NULL;

-- CREATE INDEX idx_orders_commitment ON public.orders(commitment_id);

-- RLS policies for group_buy_campaigns
-- ALTER TABLE public.group_buy_campaigns ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Public can view active campaigns" ON public.group_buy_campaigns
--   FOR SELECT USING (status = 'active');

-- CREATE POLICY "Admins can manage campaigns" ON public.group_buy_campaigns
--   FOR ALL USING (public.is_admin());

-- RLS policies for group_buy_commitments
-- ALTER TABLE public.group_buy_commitments ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view own commitments" ON public.group_buy_commitments
