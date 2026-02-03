create table if not exists public.order_communications (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  type text not null check (type in ('email', 'sms', 'system', 'note')),
  subject text,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.order_communications enable row level security;

-- Policies
create policy "Admins can view all communications"
  on public.order_communications for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can insert communications"
  on public.order_communications for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Add index
create index order_communications_order_id_idx on public.order_communications(order_id);
