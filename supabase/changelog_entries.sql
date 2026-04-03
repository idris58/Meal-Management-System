create table if not exists public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  entity_type text not null check (entity_type in ('member', 'expense', 'meal_log', 'deposit')),
  entity_id uuid not null,
  action text not null check (action in ('create', 'update', 'delete')),
  title text not null,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists changelog_entries_user_id_idx on public.changelog_entries(user_id);
create index if not exists changelog_entries_cycle_id_idx on public.changelog_entries(cycle_id);
create index if not exists changelog_entries_created_at_idx on public.changelog_entries(created_at desc);

alter table public.changelog_entries enable row level security;

drop policy if exists own_changelog_entries on public.changelog_entries;
create policy own_changelog_entries
on public.changelog_entries
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
