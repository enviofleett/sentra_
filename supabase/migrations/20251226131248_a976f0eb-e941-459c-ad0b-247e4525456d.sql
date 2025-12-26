-- Create waiting_list table for pre-launch signups
CREATE TABLE public.waiting_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  social_handle TEXT,
  is_social_verified BOOLEAN DEFAULT false,
  reward_credited BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pre_launch_settings table for admin configuration
CREATE TABLE public.pre_launch_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_prelaunch_mode BOOLEAN DEFAULT true,
  waitlist_reward_amount NUMERIC DEFAULT 100000,
  launch_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_launch_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for waiting_list
CREATE POLICY "Anyone can insert to waitlist" 
ON public.waiting_list 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all waitlist entries" 
ON public.waiting_list 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can update waitlist entries" 
ON public.waiting_list 
FOR UPDATE 
USING (is_admin());

-- RLS policies for pre_launch_settings
CREATE POLICY "Anyone can view pre_launch_settings" 
ON public.pre_launch_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage pre_launch_settings" 
ON public.pre_launch_settings 
FOR ALL 
USING (is_admin());

-- Insert default pre_launch_settings row
INSERT INTO public.pre_launch_settings (is_prelaunch_mode, waitlist_reward_amount) 
VALUES (true, 100000);

-- Create function for atomic verify and reward
CREATE OR REPLACE FUNCTION public.verify_and_reward_user(
  entry_id UUID,
  admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_verified BOOLEAN;
BEGIN
  -- Check if already verified
  SELECT is_social_verified INTO v_already_verified 
  FROM waiting_list WHERE id = entry_id;
  
  IF v_already_verified THEN
    RETURN false;
  END IF;
  
  -- Update the waitlist entry
  UPDATE waiting_list 
  SET 
    is_social_verified = true,
    reward_credited = true,
    verified_at = now(),
    verified_by = admin_id,
    updated_at = now()
  WHERE id = entry_id;
  
  RETURN true;
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_waiting_list_updated_at
BEFORE UPDATE ON public.waiting_list
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pre_launch_settings_updated_at
BEFORE UPDATE ON public.pre_launch_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();