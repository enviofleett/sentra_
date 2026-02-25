-- Add virtual_account_details to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS virtual_account_details JSONB;
