create table if not exists public.share_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.share_links enable row level security;

drop policy if exists own_manage_share_links on public.share_links;
create policy own_manage_share_links
on public.share_links
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
