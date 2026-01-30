-- Migration commented out to resolve conflict with 20251112 baseline
-- This migration attempted to create tables/types that are properly defined in later migrations.

-- Create scent_profile enum
-- CREATE TYPE public.scent_profile AS ENUM (
--   'floral',
--   'citrus',
--   'woody',
--   'oriental',
--   'fresh',
--   'spicy',
--   'aquatic',
--   'gourmand'
-- );

-- Create order_status enum
-- CREATE TYPE public.order_status AS ENUM (
--   'pending',
--   'processing',
--   'shipped',
--   'delivered',
--   'cancelled'
-- );

-- Add scent_profile column to products table
-- ALTER TABLE public.products 
-- ADD COLUMN IF NOT EXISTS scent_profile scent_profile;

-- Create profiles table for customer data
-- CREATE TABLE IF NOT EXISTS public.profiles (
--   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
--   email TEXT NOT NULL,
--   full_name TEXT,
--   phone TEXT,
--   default_shipping_address JSONB,
--   default_billing_address JSONB,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
-- );

-- Enable RLS on profiles
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
-- CREATE POLICY "Users can view own profile"
--   ON public.profiles FOR SELECT
--   USING (auth.uid() = id);

-- CREATE POLICY "Users can update own profile"
--   ON public.profiles FOR UPDATE
--   USING (auth.uid() = id);

-- CREATE POLICY "Users can insert own profile"
--   ON public.profiles FOR INSERT
--   WITH CHECK (auth.uid() = id);

-- CREATE POLICY "Admins can view all profiles"
--   ON public.profiles FOR SELECT
--   USING (public.is_admin());

-- Create orders table
-- CREATE TABLE IF NOT EXISTS public.orders (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
--   customer_email TEXT NOT NULL,
--   status order_status DEFAULT 'pending' NOT NULL,
--   items JSONB NOT NULL,
--   subtotal NUMERIC(10,2) NOT NULL,
--   tax NUMERIC(10,2) DEFAULT 0,
--   shipping_cost NUMERIC(10,2) DEFAULT 0,
--   total_amount NUMERIC(10,2) NOT NULL,
--   shipping_address JSONB NOT NULL,
--   billing_address JSONB NOT NULL,
--   paystack_reference TEXT,
--   paystack_status TEXT,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
-- );

-- Enable RLS on orders
-- ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders RLS policies
-- CREATE POLICY "Users can view own orders"
--   ON public.orders FOR SELECT
--   USING (auth.uid() = user_id);

-- CREATE POLICY "Admins can view all orders"
--   ON public.orders FOR SELECT
--   USING (public.is_admin());

-- CREATE POLICY "Order processors can view all orders"
--   ON public.orders FOR SELECT
--   USING (public.has_role(auth.uid(), 'order_processor'));

-- CREATE POLICY "Admins can update orders"
--   ON public.orders FOR UPDATE
--   USING (public.is_admin());

-- CREATE POLICY "Order processors can update orders"
