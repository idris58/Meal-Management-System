-- One-time member self-join links. The UUID primary key is the opaque token
-- embedded in the public invite URL; no direct table access is granted.

create table if not exists public.member_invites (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes(id) on delete cascade,
  target_member_id uuid references public.members(id) on delete set null,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '7 days'),
  claimed_by_profile_id uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint member_invites_claim_consistency check (
    (claimed_at is null and claimed_by_profile_id is null) or
    (claimed_at is not null and claimed_by_profile_id is not null)
  )
);

create index if not exists member_invites_mess_created_idx on public.member_invites(mess_id, created_at desc);
create index if not exists member_invites_target_idx on public.member_invites(target_member_id) where target_member_id is not null;
alter table public.member_invites enable row level security;

create or replace function public.member_invite_status(invite public.member_invites)
returns text language sql stable as $$
  select case
    when invite.revoked_at is not null then 'revoked'
    when invite.claimed_at is not null then 'used'
    when invite.expires_at <= now() then 'expired'
    else 'active'
  end
$$;

create or replace function public.create_member_invite(target_member_id_input uuid default null)
returns public.member_invites
language plpgsql security definer set search_path = public
as $$
declare created_invite public.member_invites;
declare current_mess uuid := public.current_mess_id();
begin
  if not public.is_current_mess_manager() then
    raise exception 'Only a manager can create member invite links';
  end if;

  if target_member_id_input is not null and not exists (
    select 1 from public.members
    where id = target_member_id_input
      and mess_id = current_mess
      and profile_id is null
      and deleted_at is null
  ) then
    raise exception 'Choose an active offline member in your mess';
  end if;

  insert into public.member_invites (mess_id, target_member_id, created_by_profile_id)
  values (current_mess, target_member_id_input, auth.uid())
  returning * into created_invite;
  return created_invite;
end;
$$;

create or replace function public.list_member_invites()
returns table(
  id uuid, target_member_id uuid, target_member_name text, expires_at timestamptz,
  created_at timestamptz, claimed_at timestamptz, revoked_at timestamptz, status text
)
language sql stable security definer set search_path = public
as $$
  select i.id, i.target_member_id, m.name, i.expires_at, i.created_at, i.claimed_at,
         i.revoked_at, public.member_invite_status(i)
  from public.member_invites i
  left join public.members m on m.id = i.target_member_id
  where i.mess_id = public.current_mess_id()
    and public.is_current_mess_manager()
  order by i.created_at desc
$$;

create or replace function public.revoke_member_invite(invite_id_input uuid)
returns public.member_invites
language plpgsql security definer set search_path = public
as $$
declare revoked_invite public.member_invites;
begin
  if not public.is_current_mess_manager() then
    raise exception 'Only a manager can revoke member invite links';
  end if;
  update public.member_invites set revoked_at = now()
  where id = invite_id_input and mess_id = public.current_mess_id()
    and revoked_at is null and claimed_at is null and expires_at > now()
  returning * into revoked_invite;
  if not found then raise exception 'This active invite link was not found'; end if;
  return revoked_invite;
end;
$$;

-- This intentionally exposes only what a recipient needs before signing in.
create or replace function public.get_member_invite_preview(invite_token uuid)
returns table(mess_name text, target_member_name text, expires_at timestamptz, status text)
language sql stable security definer set search_path = public
as $$
  select mess.name, member.name, i.expires_at, public.member_invite_status(i)
  from public.member_invites i
  join public.messes mess on mess.id = i.mess_id
  left join public.members member on member.id = i.target_member_id
  where i.id = invite_token
$$;

create or replace function public.accept_member_invite(invite_token uuid)
returns public.members
language plpgsql security definer set search_path = public
as $$
declare invite_row public.member_invites;
declare profile_row public.profiles;
declare accepted_member public.members;
declare next_sort_order integer;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  select * into invite_row from public.member_invites where id = invite_token for update;
  if not found then raise exception 'This invite link was not found'; end if;
  if invite_row.revoked_at is not null then raise exception 'This invite link has been revoked'; end if;
  if invite_row.expires_at <= now() then raise exception 'This invite link has expired'; end if;
  if invite_row.claimed_at is not null then raise exception 'This invite link has already been used'; end if;

  select * into profile_row from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Your profile is not ready yet. Please try again.'; end if;
  if profile_row.mess_id is not null then
    raise exception 'Your account already belongs to a mess';
  end if;

  if invite_row.target_member_id is not null then
    update public.members set profile_id = auth.uid(), user_id = auth.uid()
    where id = invite_row.target_member_id and mess_id = invite_row.mess_id
      and profile_id is null and deleted_at is null
    returning * into accepted_member;
    if not found then raise exception 'The offline member for this invite is no longer available'; end if;
  else
    select coalesce(max(sort_order), -1) + 1 into next_sort_order
    from public.members where mess_id = invite_row.mess_id;
    insert into public.members (name, avatar, user_id, mess_id, profile_id, sort_order)
    values (profile_row.full_name, upper(substr(profile_row.full_name, 1, 2)), auth.uid(), invite_row.mess_id, auth.uid(), next_sort_order)
    returning * into accepted_member;
  end if;

  update public.profiles set mess_id = invite_row.mess_id, role = 'member', updated_at = now()
  where id = auth.uid();
  update public.member_invites set claimed_by_profile_id = auth.uid(), claimed_at = now()
  where id = invite_row.id;
  return accepted_member;
end;
$$;

revoke all on table public.member_invites from anon, authenticated;
revoke all on function public.create_member_invite(uuid), public.list_member_invites(), public.revoke_member_invite(uuid), public.accept_member_invite(uuid) from public;
revoke all on function public.get_member_invite_preview(uuid) from public;
grant execute on function public.create_member_invite(uuid), public.list_member_invites(), public.revoke_member_invite(uuid), public.accept_member_invite(uuid) to authenticated;
grant execute on function public.get_member_invite_preview(uuid) to anon, authenticated;
