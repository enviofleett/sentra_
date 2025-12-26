-- Create table for profit split configuration
CREATE TABLE public.profit_split_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  capital_percentage NUMERIC NOT NULL DEFAULT 40,
  admin_percentage NUMERIC NOT NULL DEFAULT 20,
  growth_percentage NUMERIC NOT NULL DEFAULT 25,
  marketing_percentage NUMERIC NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT percentages_sum_100 CHECK (
    capital_percentage + admin_percentage + growth_percentage + marketing_percentage = 100
  )
);

-- Create table to track actual profit allocations
CREATE TABLE public.profit_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id),
  commitment_id UUID REFERENCES public.group_buy_commitments(id),
  payment_reference TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  capital_amount NUMERIC NOT NULL,
  admin_amount NUMERIC NOT NULL,
  growth_amount NUMERIC NOT NULL,
  marketing_amount NUMERIC NOT NULL,
  split_config_id UUID REFERENCES public.profit_split_config(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create view for bucket totals
CREATE VIEW public.profit_bucket_totals AS
SELECT 
  SUM(capital_amount) as total_capital,
  SUM(admin_amount) as total_admin,
  SUM(growth_amount) as total_growth,
  SUM(marketing_amount) as total_marketing,
  SUM(total_amount) as total_revenue,
  COUNT(*) as transaction_count
FROM public.profit_allocations;

-- Enable RLS
ALTER TABLE public.profit_split_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profit_split_config
CREATE POLICY "Anyone can view active profit split config"
ON public.profit_split_config FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage profit split config"
ON public.profit_split_config FOR ALL
USING (public.is_admin());

-- RLS Policies for profit_allocations
CREATE POLICY "Admins can view all profit allocations"
ON public.profit_allocations FOR SELECT
USING (public.is_admin());

CREATE POLICY "System can insert profit allocations"
ON public.profit_allocations FOR INSERT
WITH CHECK (true);

-- Insert default configuration
INSERT INTO public.profit_split_config (name, capital_percentage, admin_percentage, growth_percentage, marketing_percentage)
VALUES ('Default Split', 40, 20, 25, 15);

-- Create function to calculate and record profit split
CREATE OR REPLACE FUNCTION public.record_profit_split(
  p_order_id UUID,
  p_commitment_id UUID,
  p_payment_reference TEXT,
  p_total_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_allocation_id UUID;
BEGIN
  -- Get active split configuration
  SELECT * INTO v_config
  FROM profit_split_config
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Default percentages if no config exists
    v_config.id := NULL;
    v_config.capital_percentage := 40;
    v_config.admin_percentage := 20;
    v_config.growth_percentage := 25;
    v_config.marketing_percentage := 15;
  END IF;

  -- Insert allocation record
  INSERT INTO profit_allocations (
    order_id,
    commitment_id,
    payment_reference,
    total_amount,
    capital_amount,
    admin_amount,
    growth_amount,
    marketing_amount,
    split_config_id
  ) VALUES (
    p_order_id,
    p_commitment_id,
    p_payment_reference,
    p_total_amount,
    ROUND(p_total_amount * v_config.capital_percentage / 100, 2),
    ROUND(p_total_amount * v_config.admin_percentage / 100, 2),
    ROUND(p_total_amount * v_config.growth_percentage / 100, 2),
    ROUND(p_total_amount * v_config.marketing_percentage / 100, 2),
    v_config.id
  )
  RETURNING id INTO v_allocation_id;

  RETURN v_allocation_id;
END;
$$;