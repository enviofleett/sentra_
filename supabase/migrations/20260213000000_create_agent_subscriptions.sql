
-- Create agent_plans table
CREATE TABLE IF NOT EXISTS public.agent_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_agent_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_agent_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.agent_plans(id),
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    payment_reference TEXT, -- To link to Paystack or Wallet transaction
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.agent_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agent_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for agent_plans
CREATE POLICY "Agent plans are viewable by everyone" 
ON public.agent_plans FOR SELECT 
USING (true);

CREATE POLICY "Agent plans are manageable by admins" 
ON public.agent_plans FOR ALL 
USING (public.is_admin());

-- Policies for user_agent_subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.user_agent_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" 
ON public.user_agent_subscriptions FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can manage all subscriptions" 
ON public.user_agent_subscriptions FOR ALL 
USING (public.is_admin());

-- Insert default plans
INSERT INTO public.agent_plans (name, description, price, duration_days, features) VALUES
('Weekly Pass', '7 days of AI business consultation', 2500, 7, '["Unlimited Chat", "Market Trends", "Pricing Advice"]'),
('Monthly Pro', '30 days of premium AI business consultation', 8000, 30, '["Unlimited Chat", "Market Trends", "Pricing Advice", "Priority Support"]');

-- Function to check active subscription
CREATE OR REPLACE FUNCTION public.has_active_agent_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_agent_subscriptions 
        WHERE user_id = p_user_id 
        AND is_active = true 
        AND expires_at > NOW()
    );
END;
$$;
