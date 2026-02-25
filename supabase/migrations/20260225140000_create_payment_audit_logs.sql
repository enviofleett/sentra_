
-- Create a table for auditing payment webhook events and errors
create table if not exists public.payment_audit_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  payment_reference text,
  provider text not null default 'paystack',
  event_type text, -- e.g., 'charge.success', 'transfer.success'
  status text, -- 'success', 'failed', 'pending', 'warning'
  payload jsonb, -- The full webhook payload
  metadata jsonb, -- Extracted metadata for easier querying
  error_message text,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.payment_audit_logs enable row level security;

-- Policy: Admins can view all logs
create policy "Admins can view payment audit logs"
  on public.payment_audit_logs
  for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role = 'admin'
    )
  );

-- Policy: Service role can insert (for webhooks)
create policy "Service role can insert payment audit logs"
  on public.payment_audit_logs
  for insert
  with check (true);

-- Index for faster searching
create index if not exists idx_payment_audit_logs_order_id on public.payment_audit_logs(order_id);
create index if not exists idx_payment_audit_logs_payment_reference on public.payment_audit_logs(payment_reference);
create index if not exists idx_payment_audit_logs_created_at on public.payment_audit_logs(created_at);
