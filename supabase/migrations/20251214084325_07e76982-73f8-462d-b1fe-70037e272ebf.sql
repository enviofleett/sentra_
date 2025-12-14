-- Add version column for optimistic locking to prevent race conditions
ALTER TABLE public.group_buy_campaigns 
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.group_buy_campaigns.version IS 'Version number for optimistic locking to prevent race conditions during concurrent commitment updates';