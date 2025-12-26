-- Fix security definer view by dropping and recreating with security_invoker
DROP VIEW IF EXISTS public.profit_bucket_totals;

CREATE VIEW public.profit_bucket_totals 
WITH (security_invoker = true)
AS
SELECT 
  SUM(capital_amount) as total_capital,
  SUM(admin_amount) as total_admin,
  SUM(growth_amount) as total_growth,
  SUM(marketing_amount) as total_marketing,
  SUM(total_amount) as total_revenue,
  COUNT(*) as transaction_count
FROM public.profit_allocations;