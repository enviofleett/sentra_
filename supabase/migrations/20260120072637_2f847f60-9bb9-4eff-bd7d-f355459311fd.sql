-- Create shipping_regions table
CREATE TABLE public.shipping_regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shipping_matrix table (defines cost between regions)
CREATE TABLE public.shipping_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_region_id UUID NOT NULL REFERENCES public.shipping_regions(id) ON DELETE CASCADE,
  destination_region_id UUID NOT NULL REFERENCES public.shipping_regions(id) ON DELETE CASCADE,
  base_cost NUMERIC NOT NULL DEFAULT 0,
  weight_rate NUMERIC NOT NULL DEFAULT 0,
  estimated_days TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(origin_region_id, destination_region_id)
);

-- Add shipping_region_id to vendors table
ALTER TABLE public.vendors 
ADD COLUMN shipping_region_id UUID REFERENCES public.shipping_regions(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.shipping_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_matrix ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shipping_regions
CREATE POLICY "Admins can manage shipping regions"
ON public.shipping_regions
FOR ALL
USING (public.is_admin());

CREATE POLICY "Anyone can view active shipping regions"
ON public.shipping_regions
FOR SELECT
USING (is_active = true);

-- RLS Policies for shipping_matrix
CREATE POLICY "Admins can manage shipping matrix"
ON public.shipping_matrix
FOR ALL
USING (public.is_admin());

CREATE POLICY "Anyone can view active shipping matrix routes"
ON public.shipping_matrix
FOR SELECT
USING (is_active = true);

-- Create updated_at triggers
CREATE TRIGGER update_shipping_regions_updated_at
BEFORE UPDATE ON public.shipping_regions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_matrix_updated_at
BEFORE UPDATE ON public.shipping_matrix
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default regions for Nigeria
INSERT INTO public.shipping_regions (name) VALUES
  ('Lagos Island'),
  ('Lagos Mainland'),
  ('Abuja'),
  ('Other States');