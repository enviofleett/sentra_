-- Fix for Order ed7844a9
-- Run this in Supabase SQL Editor if you cannot deploy the manual-fix-order function.
-- Note: This SQL update will NOT trigger the confirmation email. 
-- To trigger the email, use the manual-fix-order Edge Function instead.

UPDATE orders
SET 
  status = 'processing',
  payment_status = 'paid',
  paystack_status = 'success',
  updated_at = now()
WHERE 
  id::text LIKE 'ed7844a9%' 
  AND status != 'processing';

-- Verify the update
SELECT id, status, payment_status, paystack_status FROM orders WHERE id::text LIKE 'ed7844a9%';
