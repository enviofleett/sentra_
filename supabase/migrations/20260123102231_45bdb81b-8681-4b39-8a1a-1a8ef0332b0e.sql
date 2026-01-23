-- Create password_reset_tokens table for custom password reset flow
-- This bypasses Supabase's auth URL to avoid Gmail's "suspicious link" warnings
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast token lookup
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No direct access to tokens - all access goes through edge functions using service role
-- This prevents token enumeration attacks

-- Function to generate a cryptographically secure token
CREATE OR REPLACE FUNCTION public.generate_password_reset_token(p_user_id UUID, p_expires_in_minutes INTEGER DEFAULT 10)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Generate a secure random token (32 bytes = 64 hex chars)
  v_token := encode(gen_random_bytes(32), 'hex');
  
  -- Invalidate any existing unused tokens for this user
  UPDATE password_reset_tokens 
  SET used_at = now() 
  WHERE user_id = p_user_id AND used_at IS NULL;
  
  -- Insert new token
  INSERT INTO password_reset_tokens (user_id, token, expires_at)
  VALUES (p_user_id, v_token, now() + (p_expires_in_minutes || ' minutes')::INTERVAL);
  
  RETURN v_token;
END;
$$;

-- Function to validate and consume a password reset token
CREATE OR REPLACE FUNCTION public.validate_password_reset_token(p_token TEXT)
RETURNS TABLE(user_id UUID, email TEXT, is_valid BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  -- Find the token
  SELECT prt.*, p.email INTO v_token_record
  FROM password_reset_tokens prt
  JOIN profiles p ON p.id = prt.user_id
  WHERE prt.token = p_token;
  
  -- Token not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false, 'Invalid or expired reset link'::TEXT;
    RETURN;
  END IF;
  
  -- Token already used
  IF v_token_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false, 'This reset link has already been used'::TEXT;
    RETURN;
  END IF;
  
  -- Token expired
  IF v_token_record.expires_at < now() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false, 'This reset link has expired. Please request a new one.'::TEXT;
    RETURN;
  END IF;
  
  -- Token is valid - return user info
  RETURN QUERY SELECT v_token_record.user_id, v_token_record.email, true, NULL::TEXT;
END;
$$;

-- Function to mark token as used
CREATE OR REPLACE FUNCTION public.consume_password_reset_token(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE password_reset_tokens 
  SET used_at = now() 
  WHERE token = p_token AND used_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Add comment
COMMENT ON TABLE public.password_reset_tokens IS 'Custom password reset tokens that bypass Supabase auth URLs to avoid email client security warnings';