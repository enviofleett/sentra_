-- Create atomic function for incrementing group buy quantity
-- Uses row-level locking to prevent overselling under high concurrency

CREATE OR REPLACE FUNCTION public.atomic_increment_campaign_quantity(
  p_campaign_id UUID,
  p_quantity INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  new_quantity INTEGER,
  remaining_spots INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
  v_new_quantity INTEGER;
BEGIN
  -- Lock the row for update to prevent concurrent modifications
  SELECT id, current_quantity, goal_quantity, status, expiry_at
  INTO v_campaign
  FROM group_buy_campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  -- Campaign not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 'Campaign not found'::TEXT;
    RETURN;
  END IF;

  -- Campaign not active
  IF v_campaign.status != 'active' THEN
    RETURN QUERY SELECT false, v_campaign.current_quantity, (v_campaign.goal_quantity - v_campaign.current_quantity), 'Campaign is not active'::TEXT;
    RETURN;
  END IF;

  -- Campaign expired
  IF v_campaign.expiry_at < now() THEN
    RETURN QUERY SELECT false, v_campaign.current_quantity, (v_campaign.goal_quantity - v_campaign.current_quantity), 'Campaign has expired'::TEXT;
    RETURN;
  END IF;

  -- Check capacity
  v_new_quantity := v_campaign.current_quantity + p_quantity;
  
  IF v_new_quantity > v_campaign.goal_quantity THEN
    RETURN QUERY SELECT 
      false, 
      v_campaign.current_quantity, 
      (v_campaign.goal_quantity - v_campaign.current_quantity),
      format('Only %s spots remaining', v_campaign.goal_quantity - v_campaign.current_quantity)::TEXT;
    RETURN;
  END IF;

  -- Atomic update
  UPDATE group_buy_campaigns
  SET 
    current_quantity = v_new_quantity,
    version = version + 1,
    updated_at = now()
  WHERE id = p_campaign_id;

  -- Return success
  RETURN QUERY SELECT 
    true, 
    v_new_quantity, 
    (v_campaign.goal_quantity - v_new_quantity),
    NULL::TEXT;
END;
$$;
