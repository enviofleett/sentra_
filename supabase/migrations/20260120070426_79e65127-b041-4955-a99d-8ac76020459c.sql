-- Create shipping_weight_rates table (Global Platform Rates)
CREATE TABLE public.shipping_weight_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_weight NUMERIC NOT NULL,
  max_weight NUMERIC NOT NULL,
  cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT weight_range_valid CHECK (max_weight > min_weight),
  CONSTRAINT positive_values CHECK (min_weight >= 0 AND cost >= 0)
);

-- Create vendor_shipping_rules table (Vendor-Specific Logic)
CREATE TABLE public.vendor_shipping_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  shipping_schedule TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT positive_quantity CHECK (min_quantity > 0)
);

-- Enable RLS
ALTER TABLE public.shipping_weight_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_shipping_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shipping_weight_rates
CREATE POLICY "Admins can manage shipping weight rates"
ON public.shipping_weight_rates
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can read shipping weight rates"
ON public.shipping_weight_rates
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for vendor_shipping_rules
CREATE POLICY "Admins can manage vendor shipping rules"
ON public.vendor_shipping_rules
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can read active vendor shipping rules"
ON public.vendor_shipping_rules
FOR SELECT
TO authenticated
USING (is_active = true);

-- Create indexes for performance
CREATE INDEX idx_vendor_shipping_rules_vendor_id ON public.vendor_shipping_rules(vendor_id);
CREATE INDEX idx_vendor_shipping_rules_active ON public.vendor_shipping_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_shipping_weight_rates_range ON public.shipping_weight_rates(min_weight, max_weight);

-- Add weight column to products table if not exists
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 0;

-- Triggers for updated_at
CREATE TRIGGER update_shipping_weight_rates_updated_at
BEFORE UPDATE ON public.shipping_weight_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendor_shipping_rules_updated_at
BEFORE UPDATE ON public.vendor_shipping_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();