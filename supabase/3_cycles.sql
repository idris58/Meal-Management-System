create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('active', 'pending', 'closed')),
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  finalized_at timestamptz,
  members_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cycles_user_id_idx on public.cycles(user_id);
create unique index if not exists cycles_one_active_per_user_idx
  on public.cycles(user_id)
  where status = 'active';
create unique index if not exists cycles_one_pending_per_user_idx
  on public.cycles(user_id)
  where status = 'pending';

create table if not exists public.cycle_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists cycle_deposits_user_id_idx on public.cycle_deposits(user_id);
create index if not exists cycle_deposits_cycle_id_idx on public.cycle_deposits(cycle_id);

alter table public.expenses add column if not exists cycle_id uuid references public.cycles(id) on delete cascade;
alter table public.meal_logs add column if not exists cycle_id uuid references public.cycles(id) on delete cascade;

alter table public.cycles enable row level security;
alter table public.cycle_deposits enable row level security;

drop policy if exists own_cycles on public.cycles;
create policy own_cycles
on public.cycles
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists own_cycle_deposits on public.cycle_deposits;
create policy own_cycle_deposits
on public.cycle_deposits
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

do $$
declare
  cycle_record record;
  active_cycle_id uuid;
begin
  for cycle_record in
    select distinct user_id
    from public.members
    where user_id is not null
  loop
    select id
    into active_cycle_id
    from public.cycles
    where user_id = cycle_record.user_id
      and status = 'active'
    limit 1;

    if active_cycle_id is null then
      insert into public.cycles (user_id, status)
      values (cycle_record.user_id, 'active')
      returning id into active_cycle_id;
    end if;

    update public.expenses
    set cycle_id = active_cycle_id
    where user_id = cycle_record.user_id
      and cycle_id is null;

    update public.meal_logs
    set cycle_id = active_cycle_id
    where user_id = cycle_record.user_id
      and cycle_id is null;
  end loop;
end $$;
