-- Create scent_profile enum
CREATE TYPE public.scent_profile AS ENUM (
  'floral',
  'citrus',
  'woody',
  'oriental',
  'fresh',
  'spicy',
  'aquatic',
  'gourmand'
);

-- Create order_status enum
CREATE TYPE public.order_status AS ENUM (
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

-- Add scent_profile column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS scent_profile scent_profile;

-- Create profiles table for customer data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  default_shipping_address JSONB,
  default_billing_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  status order_status DEFAULT 'pending' NOT NULL,
  items JSONB NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) DEFAULT 0,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  billing_address JSONB NOT NULL,
  paystack_reference TEXT,
  paystack_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders RLS policies
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Order processors can view all orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'order_processor'));

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Order processors can update orders"
  ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'order_processor'));

CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Cart items RLS policies
CREATE POLICY "Users can manage own cart"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Email templates RLS policies
CREATE POLICY "Anyone can view email templates"
  ON public.email_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL
  USING (public.is_admin());

CREATE POLICY "Product managers can manage email templates"
  ON public.email_templates FOR ALL
  USING (public.has_role(auth.uid(), 'product_manager'));

-- Create product_reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on product_reviews
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Product reviews RLS policies
CREATE POLICY "Anyone can view approved reviews"
  ON public.product_reviews FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Users can view own reviews"
  ON public.product_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create reviews"
  ON public.product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON public.product_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
  ON public.product_reviews FOR ALL
  USING (public.is_admin());

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default email templates
INSERT INTO public.email_templates (template_id, subject, html_content, text_content, variables)
VALUES 
  (
    'ORDER_CONFIRMATION',
    'Order Confirmation - Sentra Perfumes',
    '<h1>Thank you for your order, {{customer_name}}!</h1><p>Your order #{{order_id}} has been confirmed.</p><p>Total: ₦{{total_amount}}</p><p>We will notify you when your order ships.</p>',
    'Thank you for your order, {{customer_name}}! Your order #{{order_id}} has been confirmed. Total: ₦{{total_amount}}. We will notify you when your order ships.',
    '{"customer_name": "Customer full name", "order_id": "Order reference", "total_amount": "Order total"}'::jsonb
  ),
  (
    'ORDER_SHIPPED',
    'Your Sentra Order Has Shipped',
    '<h1>Great news, {{customer_name}}!</h1><p>Your order #{{order_id}} has been shipped and is on its way.</p><p>You can expect delivery within 3-5 business days.</p>',
    'Great news, {{customer_name}}! Your order #{{order_id}} has been shipped and is on its way. You can expect delivery within 3-5 business days.',
    '{"customer_name": "Customer full name", "order_id": "Order reference"}'::jsonb
  ),
  (
    'WELCOME_CUSTOMER',
    'Welcome to Sentra Perfumes',
    '<h1>Welcome to Sentra, {{customer_name}}!</h1><p>Thank you for joining us. Discover our collection of luxury perfumes.</p><p>Enjoy your shopping experience!</p>',
    'Welcome to Sentra, {{customer_name}}! Thank you for joining us. Discover our collection of luxury perfumes. Enjoy your shopping experience!',
    '{"customer_name": "Customer full name"}'::jsonb
  )
ON CONFLICT (template_id) DO NOTHING;

-- Create helper function for product managers
CREATE OR REPLACE FUNCTION public.is_product_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'product_manager'::public.app_role);
$$;

-- Create helper function for order processors
CREATE OR REPLACE FUNCTION public.is_order_processor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'order_processor'::public.app_role);
$$;

-- Update products RLS policies for product managers
CREATE POLICY "Product managers can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_product_manager());

CREATE POLICY "Product managers can update products"
  ON public.products FOR UPDATE
  USING (public.is_product_manager());

CREATE POLICY "Product managers can delete products"
  ON public.products FOR DELETE
  USING (public.is_product_manager());

-- Update categories RLS policies for product managers
CREATE POLICY "Product managers can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_product_manager());

CREATE POLICY "Product managers can update categories"
  ON public.categories FOR UPDATE
  USING (public.is_product_manager());

CREATE POLICY "Product managers can delete categories"
  ON public.categories FOR DELETE
  USING (public.is_product_manager());