create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar text,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade
);

create index if not exists idx_members_user_id on public.members(user_id);
create index if not exists idx_members_created_at on public.members(created_at);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  amount decimal(10, 2) not null,
  description text not null,
  type text not null check (type in ('meal', 'fixed')),
  paid_by text not null,
  date timestamptz default now(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade
);

create index if not exists idx_expenses_user_id on public.expenses(user_id);
create index if not exists idx_expenses_date on public.expenses(date);
create index if not exists idx_expenses_type on public.expenses(type);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  date date not null,
  count decimal(4, 2) not null default 0,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade,
  constraint meal_logs_member_id_date_key unique (member_id, date)
);

create index if not exists meal_logs_user_id_idx on public.meal_logs(user_id);
create index if not exists idx_meal_logs_date on public.meal_logs(date);
create index if not exists idx_meal_logs_member_id on public.meal_logs(member_id);

alter table public.members enable row level security;
alter table public.expenses enable row level security;
alter table public.meal_logs enable row level security;

drop policy if exists own_members on public.members;
create policy own_members
on public.members
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists own_expenses on public.expenses;
create policy own_expenses
on public.expenses
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists own_meal_logs on public.meal_logs;
create policy own_meal_logs
on public.meal_logs
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
