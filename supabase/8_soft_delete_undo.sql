alter table public.expenses
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_expires_at timestamptz;

alter table public.members
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_expires_at timestamptz;

alter table public.cycles
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_expires_at timestamptz;

create index if not exists expenses_delete_expires_idx
  on public.expenses(delete_expires_at)
  where deleted_at is not null;

create index if not exists members_delete_expires_idx
  on public.members(delete_expires_at)
  where deleted_at is not null;

create index if not exists cycles_delete_expires_idx
  on public.cycles(delete_expires_at)
  where deleted_at is not null;
