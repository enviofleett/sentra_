
-- Create VAT Settings Table (Singleton)
create table if not exists public.vat_settings (
  id uuid default gen_random_uuid() primary key,
  rate numeric(5, 2) not null check (rate >= 0 and rate <= 100),
  is_active boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references auth.users(id)
);

-- Enable RLS for settings
alter table public.vat_settings enable row level security;

-- Create policy for reading (public/authenticated)
drop policy if exists "Anyone can read active VAT settings" on public.vat_settings;
create policy "Anyone can read active VAT settings"
  on public.vat_settings for select
  using (true);

-- Create policy for admin updates
drop policy if exists "Admins can update VAT settings" on public.vat_settings;
create policy "Admins can update VAT settings"
  on public.vat_settings for all
  using (true); 

-- Create VAT Audit Logs
create table if not exists public.vat_audit_logs (
  id uuid default gen_random_uuid() primary key,
  old_rate numeric(5, 2),
  new_rate numeric(5, 2) not null,
  changed_by uuid references auth.users(id),
  changed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for logs
alter table public.vat_audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.vat_audit_logs;
create policy "Admins can view audit logs"
  on public.vat_audit_logs for select
  using (true);

drop policy if exists "Admins can insert audit logs" on public.vat_audit_logs;
create policy "Admins can insert audit logs"
  on public.vat_audit_logs for insert
  with check (true);

-- Insert initial default rate (0%) if not exists
insert into public.vat_settings (rate, is_active)
select 0, true
where not exists (select 1 from public.vat_settings);
