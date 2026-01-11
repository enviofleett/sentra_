-- Create price_intelligence table for competitor price tracking
CREATE TABLE public.price_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  average_market_price NUMERIC(12, 2),
  lowest_market_price NUMERIC(12, 2),
  highest_market_price NUMERIC(12, 2),
  competitor_data JSONB DEFAULT '[]'::jsonb,
  last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_product_intelligence UNIQUE (product_id)
);

-- Create index for faster lookups
CREATE INDEX idx_price_intelligence_product_id ON public.price_intelligence(product_id);
CREATE INDEX idx_price_intelligence_last_scraped ON public.price_intelligence(last_scraped_at DESC);

-- Enable Row Level Security
ALTER TABLE public.price_intelligence ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can read
CREATE POLICY "Authenticated users can read price intelligence"
  ON public.price_intelligence
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Only admins can insert/update/delete (service role bypasses RLS)
CREATE POLICY "Admins can manage price intelligence"
  ON public.price_intelligence
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Create product_pricing_audit table for logging price changes
CREATE TABLE public.product_pricing_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_price NUMERIC(12, 2),
  new_price NUMERIC(12, 2),
  change_reason TEXT,
  change_source TEXT DEFAULT 'manual', -- 'manual', 'auto_match', 'bulk_match'
  triggered_by UUID REFERENCES auth.users(id),
  competitor_average NUMERIC(12, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for audit table
ALTER TABLE public.product_pricing_audit ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can read audit logs
CREATE POLICY "Admins can read pricing audit"
  ON public.product_pricing_audit
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- RLS: Allow inserts via service role (edge functions)
CREATE POLICY "Service role can insert audit logs"
  ON public.product_pricing_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Add trigger for updated_at on price_intelligence
CREATE TRIGGER update_price_intelligence_updated_at
  BEFORE UPDATE ON public.price_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();