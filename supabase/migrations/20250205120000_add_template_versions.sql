
create table if not exists public.email_template_versions (
  id uuid default gen_random_uuid() primary key,
  template_id text not null references public.email_templates(template_id) on delete cascade,
  subject text,
  html_content text,
  text_content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id)
);

alter table public.email_template_versions enable row level security;

create policy "Admins can view all template versions"
  on public.email_template_versions for select
  using (true); -- Assuming admin check is handled at app level or stricter policy needed

create policy "Admins can insert template versions"
  on public.email_template_versions for insert
  with check (true);
