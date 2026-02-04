
-- Create user_addresses table
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    region_id UUID REFERENCES public.shipping_regions(id),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create order_shipments table
CREATE TABLE IF NOT EXISTS public.order_shipments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    shipping_address JSONB NOT NULL,
    items JSONB NOT NULL, -- Array of {product_id, quantity, name, price, vendor_id}
    shipping_method TEXT DEFAULT 'standard',
    shipping_cost NUMERIC DEFAULT 0,
    tracking_number TEXT,
    status TEXT DEFAULT 'pending', -- pending, processing, shipped, delivered
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;

-- user_addresses policies
CREATE POLICY "Users can view their own addresses"
    ON public.user_addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
    ON public.user_addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
    ON public.user_addresses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
    ON public.user_addresses FOR DELETE
    USING (auth.uid() = user_id);

-- order_shipments policies
CREATE POLICY "Users can view their own order shipments"
    ON public.order_shipments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_shipments.order_id
        AND orders.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own order shipments"
    ON public.order_shipments FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_shipments.order_id
        AND orders.user_id = auth.uid()
    ));

-- Grant permissions
GRANT ALL ON public.user_addresses TO authenticated;
GRANT ALL ON public.order_shipments TO authenticated;
GRANT ALL ON public.user_addresses TO service_role;
GRANT ALL ON public.order_shipments TO service_role;
