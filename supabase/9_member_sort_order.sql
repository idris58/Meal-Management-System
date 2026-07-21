alter table public.members
  add column if not exists sort_order integer;

with ranked_members as (
  select id, row_number() over (partition by user_id order by created_at, id) - 1 as position
  from public.members
  where sort_order is null
)
update public.members
set sort_order = ranked_members.position
from ranked_members
where public.members.id = ranked_members.id;

alter table public.members
  alter column sort_order set default 0;

create index if not exists idx_members_user_sort_order
  on public.members(user_id, sort_order, created_at);
