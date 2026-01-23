-- Enable pgcrypto extension for cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate the function now that pgcrypto is available
CREATE OR REPLACE FUNCTION public.generate_password_reset_token(p_user_id UUID, p_expires_in_minutes INTEGER DEFAULT 60)
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