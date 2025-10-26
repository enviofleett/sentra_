-- Create new enums for group buy system
CREATE TYPE group_buy_status AS ENUM (
  'pending',
  'active',
  'goal_met_pending_payment',
  'goal_met_finalized',
  'failed_expired',
  'failed_cancelled'
);

CREATE TYPE commitment_status AS ENUM (
  'committed_unpaid',
  'committed_paid',
  'payment_window_expired',
  'refunded'
);

CREATE TYPE payment_mode AS ENUM (
  'pay_to_book',
  'pay_on_success'
);

-- Create group_buy_campaigns table
CREATE TABLE public.group_buy_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  goal_quantity INTEGER NOT NULL CHECK (goal_quantity > 0),
  current_quantity INTEGER NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  discount_price NUMERIC NOT NULL CHECK (discount_price >= 0),
  payment_mode payment_mode NOT NULL DEFAULT 'pay_on_success',
  payment_window_hours INTEGER NOT NULL DEFAULT 6 CHECK (payment_window_hours > 0),
  expiry_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status group_buy_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group_buy_commitments table
CREATE TABLE public.group_buy_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.group_buy_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  committed_price NUMERIC NOT NULL CHECK (committed_price >= 0),
  payment_ref TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_deadline TIMESTAMP WITH TIME ZONE,
  status commitment_status NOT NULL DEFAULT 'committed_unpaid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_campaigns_status ON public.group_buy_campaigns(status);
CREATE INDEX idx_campaigns_expiry ON public.group_buy_campaigns(expiry_at);
CREATE INDEX idx_campaigns_product ON public.group_buy_campaigns(product_id);
CREATE INDEX idx_commitments_campaign ON public.group_buy_commitments(campaign_id);
CREATE INDEX idx_commitments_user ON public.group_buy_commitments(user_id);
CREATE INDEX idx_commitments_status ON public.group_buy_commitments(status);
CREATE INDEX idx_commitments_payment_deadline ON public.group_buy_commitments(payment_deadline);

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at_campaigns
  BEFORE UPDATE ON public.group_buy_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_commitments
  BEFORE UPDATE ON public.group_buy_commitments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add active_group_buy_id to products table
ALTER TABLE public.products 
ADD COLUMN active_group_buy_id UUID 
REFERENCES public.group_buy_campaigns(id) ON DELETE SET NULL;

CREATE INDEX idx_products_active_group_buy ON public.products(active_group_buy_id);

-- Add commitment_id to orders table
ALTER TABLE public.orders 
ADD COLUMN commitment_id UUID 
REFERENCES public.group_buy_commitments(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_commitment ON public.orders(commitment_id);

-- RLS policies for group_buy_campaigns
ALTER TABLE public.group_buy_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active campaigns" ON public.group_buy_campaigns
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage campaigns" ON public.group_buy_campaigns
  FOR ALL USING (public.is_admin());

-- RLS policies for group_buy_commitments
ALTER TABLE public.group_buy_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commitments" ON public.group_buy_commitments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create commitments" ON public.group_buy_commitments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commitments" ON public.group_buy_commitments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all commitments" ON public.group_buy_commitments
  FOR ALL USING (public.is_admin());

-- Insert email templates
INSERT INTO public.email_templates (template_id, subject, html_content, text_content, variables) VALUES
(
  'GROUPBUY_SUCCESS_PAYMENT_REQUIRED',
  'Success! Pay Now to Claim Your Discounted {{product_name}}',
  '<h1>🎉 Great News, {{customer_name}}!</h1>
   <p>The group buy campaign for <strong>{{product_name}}</strong> has reached its goal!</p>
   <p>Your special price: <strong>₦{{discount_price}}</strong></p>
   <p><strong>⏰ Important:</strong> You have until <strong>{{payment_deadline}}</strong> to complete your payment.</p>
   <p><a href="{{payment_link}}" style="background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Pay Now</a></p>
   <p>If you don''t complete payment within 6 hours, your reservation will be cancelled.</p>',
  'Great News, {{customer_name}}! The group buy for {{product_name}} has reached its goal! Pay ₦{{discount_price}} before {{payment_deadline}}. Visit {{payment_link}}',
  '{"customer_name": "string", "product_name": "string", "discount_price": "string", "payment_deadline": "string", "payment_link": "string"}'::jsonb
),
(
  'GROUPBUY_SUCCESS_PAID_FINALIZED',
  'Congratulations! Your Group Buy Order is Confirmed',
  '<h1>✅ Order Confirmed, {{customer_name}}!</h1>
   <p>Your group buy order for <strong>{{product_name}}</strong> has been confirmed!</p>
   <p>Order ID: <strong>#{{order_id}}</strong></p>
   <p>We will process your order and send you a shipping notification soon.</p>
   <p>Thank you for shopping with Sentra!</p>',
  'Order Confirmed! Your group buy order #{{order_id}} for {{product_name}} has been confirmed. Thank you for shopping with Sentra!',
  '{"customer_name": "string", "product_name": "string", "order_id": "string"}'::jsonb
),
(
  'GROUPBUY_FAILED_REFUND',
  'Notice: Group Buy Campaign Update',
  '<h1>Campaign Update, {{customer_name}}</h1>
   <p>Unfortunately, the group buy campaign for <strong>{{product_name}}</strong> did not meet its goal.</p>
   <p>Reason: {{reason}}</p>
   <p>If you made a payment, a full refund will be processed within 5-7 business days.</p>
   <p>We hope to see you in our next group buy campaign!</p>',
  'The group buy for {{product_name}} did not reach its goal. Reason: {{reason}}. Any payments will be refunded within 5-7 days.',
  '{"customer_name": "string", "product_name": "string", "reason": "string"}'::jsonb
),
(
  'GROUPBUY_COMMITMENT_CONFIRMATION',
  'Your Group Buy Commitment for {{product_name}}',
  '<h1>Thank you, {{customer_name}}!</h1>
   <p>You have successfully committed to the group buy for <strong>{{product_name}}</strong>.</p>
   <p>Your reserved quantity: <strong>{{quantity}}</strong></p>
   <p>Special price: <strong>₦{{discount_price}}</strong></p>
   <p>Current progress: <strong>{{current_quantity}}/{{goal_quantity}}</strong></p>
   <p>Campaign ends: <strong>{{expiry_date}}</strong></p>
   <p>We will notify you when the goal is reached!</p>',
  'You committed to {{product_name}} group buy. Quantity: {{quantity}} at ₦{{discount_price}}. Progress: {{current_quantity}}/{{goal_quantity}}. Campaign ends {{expiry_date}}.',
  '{"customer_name": "string", "product_name": "string", "quantity": "string", "discount_price": "string", "current_quantity": "string", "goal_quantity": "string", "expiry_date": "string"}'::jsonb
);