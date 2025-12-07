-- Update expired campaigns that are still marked as active
UPDATE group_buy_campaigns 
SET status = 'failed_expired', updated_at = now() 
WHERE expiry_at < now() AND status = 'active';

-- Clear active_group_buy_id on products where the campaign has expired or is inactive
UPDATE products p
SET active_group_buy_id = NULL, updated_at = now()
FROM group_buy_campaigns g
WHERE p.active_group_buy_id = g.id
AND g.status IN ('expired', 'failed_expired', 'cancelled', 'completed', 'goal_met_paid_finalized');

-- Create function to auto-cleanup expired campaigns (can be called via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update expired active campaigns
  UPDATE group_buy_campaigns 
  SET status = 'failed_expired', updated_at = now() 
  WHERE expiry_at < now() AND status = 'active';
  
  -- Clear product links to inactive campaigns
  UPDATE products p
  SET active_group_buy_id = NULL, updated_at = now()
  FROM group_buy_campaigns g
  WHERE p.active_group_buy_id = g.id
  AND g.status IN ('expired', 'failed_expired', 'cancelled', 'completed', 'goal_met_paid_finalized');
END;
$$;