-- Fix RLS policies for orders table to allow admin operations

-- Drop existing policies to avoid conflicts (if any exist with these names)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
    DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
    DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
    DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.orders;
END $$;

-- Create comprehensive policies

-- 1. Admins can do everything (SELECT, INSERT, UPDATE, DELETE)
-- Uses the existing is_admin() security definer function
CREATE POLICY "Admins can manage all orders"
    ON public.orders
    FOR ALL
    USING (public.is_admin());

-- 2. Users can view their own orders
CREATE POLICY "Users can view their own orders"
    ON public.orders
    FOR SELECT
    USING (auth.uid() = user_id);

-- 3. Users can create their own orders
CREATE POLICY "Users can create their own orders"
    ON public.orders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
