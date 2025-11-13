-- Create enum types
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'goal_reached', 'expired', 'completed', 'cancelled');
CREATE TYPE public.payment_mode AS ENUM ('pay_to_book', 'pay_on_success');
CREATE TYPE public.commitment_status AS ENUM ('committed_unpaid', 'committed_paid', 'payment_failed', 'cancelled', 'completed');

-- Create vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create scent_profiles table
CREATE TABLE public.scent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  notes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  scent_profile_id UUID REFERENCES public.scent_profiles(id) ON DELETE SET NULL,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sku TEXT UNIQUE,
  brand TEXT,
  size TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cart_items table
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  status order_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_address JSONB,
  billing_address JSONB,
  payment_reference TEXT,
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group_buy_campaigns table
CREATE TABLE public.group_buy_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status campaign_status DEFAULT 'draft',
  discount_price DECIMAL(10,2) NOT NULL,
  goal_quantity INTEGER NOT NULL CHECK (goal_quantity > 0),
  current_quantity INTEGER DEFAULT 0 CHECK (current_quantity >= 0),
  payment_mode payment_mode DEFAULT 'pay_on_success',
  payment_deadline TIMESTAMP WITH TIME ZONE,
  expiry_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group_buy_commitments table
CREATE TABLE public.group_buy_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.group_buy_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  committed_price DECIMAL(10,2) NOT NULL,
  status commitment_status DEFAULT 'committed_unpaid',
  payment_reference TEXT,
  payment_deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create app_config table
CREATE TABLE public.app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_vendor ON public.products(vendor_id);
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_cart_items_user ON public.cart_items(user_id);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_group_buy_campaigns_product ON public.group_buy_campaigns(product_id);
CREATE INDEX idx_group_buy_campaigns_status ON public.group_buy_campaigns(status);
CREATE INDEX idx_group_buy_commitments_campaign ON public.group_buy_commitments(campaign_id);
CREATE INDEX idx_group_buy_commitments_user ON public.group_buy_commitments(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scent_profiles_updated_at BEFORE UPDATE ON public.scent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_buy_campaigns_updated_at BEFORE UPDATE ON public.group_buy_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_buy_commitments_updated_at BEFORE UPDATE ON public.group_buy_commitments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_buy_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_buy_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
CREATE POLICY "Vendors are viewable by everyone" ON public.vendors
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage vendors" ON public.vendors
  FOR ALL USING (public.is_admin());

-- RLS Policies for categories
CREATE POLICY "Categories are viewable by everyone" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.is_admin());

-- RLS Policies for scent_profiles
CREATE POLICY "Scent profiles are viewable by everyone" ON public.scent_profiles
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage scent profiles" ON public.scent_profiles
  FOR ALL USING (public.is_admin());

-- RLS Policies for products
CREATE POLICY "Products are viewable by everyone" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.is_admin());

-- RLS Policies for cart_items
CREATE POLICY "Users can view their own cart items" ON public.cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items" ON public.cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items" ON public.cart_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items" ON public.cart_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all cart items" ON public.cart_items
  FOR SELECT USING (public.is_admin());

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all orders" ON public.orders
  FOR UPDATE USING (public.is_admin());

-- RLS Policies for group_buy_campaigns
CREATE POLICY "Group buy campaigns are viewable by everyone" ON public.group_buy_campaigns
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage group buy campaigns" ON public.group_buy_campaigns
  FOR ALL USING (public.is_admin());

-- RLS Policies for group_buy_commitments
CREATE POLICY "Users can view their own commitments" ON public.group_buy_commitments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own commitments" ON public.group_buy_commitments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all commitments" ON public.group_buy_commitments
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage all commitments" ON public.group_buy_commitments
  FOR ALL USING (public.is_admin());

-- RLS Policies for email_templates
CREATE POLICY "Email templates are viewable by everyone" ON public.email_templates
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (public.is_admin());

-- RLS Policies for app_config
CREATE POLICY "App config is viewable by everyone" ON public.app_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage app config" ON public.app_config
  FOR ALL USING (public.is_admin());

-- Insert default email templates
INSERT INTO public.email_templates (template_id, name, subject, html_content, text_content) VALUES
('ORDER_CONFIRMATION', 'Order Confirmation', 'Your Order #{{order_id}} Confirmation', 
  '<h1>Thank you for your order!</h1><p>Hi {{customer_name}},</p><p>Your order #{{order_id}} has been received and is being processed.</p><p>Total: ₦{{total_amount}}</p>',
  'Thank you for your order! Hi {{customer_name}}, Your order #{{order_id}} has been received and is being processed. Total: ₦{{total_amount}}'),
  
('WELCOME_CUSTOMER', 'Welcome Email', 'Welcome to Sentra Perfumes!',
  '<h1>Welcome to Sentra Perfumes!</h1><p>Hi {{customer_name}},</p><p>Thank you for joining us. We are excited to have you!</p>',
  'Welcome to Sentra Perfumes! Hi {{customer_name}}, Thank you for joining us. We are excited to have you!'),
  
('GROUPBUY_COMMITMENT_CONFIRMATION', 'Group Buy Commitment', 'Group Buy Commitment Confirmed',
  '<h1>Group Buy Commitment Confirmed!</h1><p>Hi {{customer_name}},</p><p>You have successfully committed to {{quantity}} units of {{product_name}} at ₦{{discount_price}} each.</p><p>Current progress: {{current_quantity}}/{{goal_quantity}}</p><p>Campaign expires: {{expiry_date}}</p>',
  'Group Buy Commitment Confirmed! Hi {{customer_name}}, You have successfully committed to {{quantity}} units of {{product_name}} at ₦{{discount_price}} each. Current progress: {{current_quantity}}/{{goal_quantity}}. Campaign expires: {{expiry_date}}');

-- Insert default categories
INSERT INTO public.categories (name, slug, description) VALUES
('Men''s Fragrances', 'mens-fragrances', 'Premium fragrances for men'),
('Women''s Fragrances', 'womens-fragrances', 'Elegant fragrances for women'),
('Unisex Fragrances', 'unisex-fragrances', 'Versatile fragrances for everyone'),
('Gift Sets', 'gift-sets', 'Perfect fragrance gift sets'),
('Body Care', 'body-care', 'Scented body care products');

-- Insert default app config
INSERT INTO public.app_config (key, value, description) VALUES
('terms_and_conditions', '{"content": "By using this platform, you agree to our terms and conditions. Please read carefully before making a purchase."}', 'Terms and conditions text'),
('shipping_info', '{"content": "Free shipping on all orders. Delivery within 3-5 business days."}', 'Shipping information'),
('return_policy', '{"content": "30-day return policy for unopened products."}', 'Return policy text');