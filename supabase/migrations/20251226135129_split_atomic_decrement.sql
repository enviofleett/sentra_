-- Create rollback function for failed commitment insertions
CREATE OR REPLACE FUNCTION public.atomic_decrement_campaign_quantity(
  p_campaign_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE group_buy_campaigns
  SET 
    current_quantity = GREATEST(0, current_quantity - p_quantity),
    version = version + 1,
    updated_at = now()
  WHERE id = p_campaign_id;
  
  RETURN FOUND;
END;
$$;
