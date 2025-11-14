-- Phase 1: Critical Schema Corrections

-- Fix 1: Add paystack_status column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS paystack_status TEXT;

-- Fix 2: Create product_analytics table
CREATE TABLE IF NOT EXISTS public.product_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'purchase')),
  user_id UUID,
  session_id TEXT,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on product_analytics
ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_analytics
CREATE POLICY "Product analytics are viewable by admins"
  ON public.product_analytics FOR SELECT
  USING (is_admin());

CREATE POLICY "Anyone can insert product analytics"
  ON public.product_analytics FOR INSERT
  WITH CHECK (true);

-- Fix 3: Add missing columns to group_buy_commitments
ALTER TABLE public.group_buy_commitments 
ADD COLUMN IF NOT EXISTS payment_ref TEXT,
ADD COLUMN IF NOT EXISTS order_id UUID;

-- Fix 4: Add payment_window_hours to group_buy_campaigns
ALTER TABLE public.group_buy_campaigns 
ADD COLUMN IF NOT EXISTS payment_window_hours INTEGER DEFAULT 6;

-- Fix 5: Update enums with correct values
-- Drop and recreate app_role enum with all values
DO $$ 
BEGIN
  -- Add missing values to app_role if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'product_manager' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'product_manager';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'order_processor' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'order_processor';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'vendor' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'vendor';
  END IF;
END $$;

-- Add missing values to campaign_status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'goal_met_pending_payment' AND enumtypid = 'campaign_status'::regtype) THEN
    ALTER TYPE campaign_status ADD VALUE 'goal_met_pending_payment';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'goal_met_paid_finalized' AND enumtypid = 'campaign_status'::regtype) THEN
    ALTER TYPE campaign_status ADD VALUE 'goal_met_paid_finalized';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'failed_expired' AND enumtypid = 'campaign_status'::regtype) THEN
    ALTER TYPE campaign_status ADD VALUE 'failed_expired';
  END IF;
END $$;

-- Add missing values to commitment_status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payment_window_expired' AND enumtypid = 'commitment_status'::regtype) THEN
    ALTER TYPE commitment_status ADD VALUE 'payment_window_expired';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'refunded' AND enumtypid = 'commitment_status'::regtype) THEN
    ALTER TYPE commitment_status ADD VALUE 'refunded';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'paid_finalized' AND enumtypid = 'commitment_status'::regtype) THEN
    ALTER TYPE commitment_status ADD VALUE 'paid_finalized';
  END IF;
END $$;

-- Create index on product_analytics for better query performance
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_id ON public.product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_event_type ON public.product_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_product_analytics_created_at ON public.product_analytics(created_at);