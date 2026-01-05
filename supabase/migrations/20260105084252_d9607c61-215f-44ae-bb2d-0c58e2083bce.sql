-- Fix search_path warning for protect_referred_by function
CREATE OR REPLACE FUNCTION public.protect_referred_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If referred_by was already set and someone tries to change it, prevent the change
  IF OLD.referred_by IS NOT NULL AND NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
    -- Silently keep the old value instead of raising an error
    NEW.referred_by := OLD.referred_by;
  END IF;
  
  RETURN NEW;
END;
$$;