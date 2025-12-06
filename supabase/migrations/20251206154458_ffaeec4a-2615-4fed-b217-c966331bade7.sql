-- Migration: Add discount_thresholds table and active_group_buy_id to products

-- New Enums for flexible discount configuration
CREATE TYPE public.threshold_type AS ENUM ('quantity', 'value');
CREATE TYPE public.target_type AS ENUM ('global', 'product', 'category');
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');

-- Discount Thresholds Table
CREATE TABLE public.discount_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.threshold_type NOT NULL,
  target_id UUID,
  target_type public.target_type NOT NULL,
  threshold NUMERIC(10,2) NOT NULL CHECK (threshold > 0),
  discount_type public.discount_type NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_discount_thresholds_target ON public.discount_thresholds(target_id);
CREATE INDEX idx_discount_thresholds_active ON public.discount_thresholds(is_active);

-- Enable RLS
ALTER TABLE public.discount_thresholds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view active discount thresholds"
ON public.discount_thresholds
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage discount thresholds"
ON public.discount_thresholds
FOR ALL
USING (public.is_admin());

-- Add updated_at trigger
CREATE TRIGGER set_discount_thresholds_updated_at
  BEFORE UPDATE ON public.discount_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add active_group_buy_id column to products table
ALTER TABLE public.products 
ADD COLUMN active_group_buy_id UUID REFERENCES public.group_buy_campaigns(id) ON DELETE SET NULL;