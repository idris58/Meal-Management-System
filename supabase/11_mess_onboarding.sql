-- Step 2: onboarding, secure mess membership, and legacy-data migration.

create or replace function public.current_mess_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select mess_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_current_mess_manager()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select role = 'manager' from public.profiles where id = auth.uid()
$$;

create or replace function public.join_mess(invite_code_input text)
returns public.messes
language plpgsql
security definer set search_path = public
as $$
declare target_mess public.messes;
declare normalized_code text := upper(regexp_replace(coalesce(invite_code_input, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if length(normalized_code) <> 6 then raise exception 'Enter a valid 6-character mess code'; end if;
  select * into target_mess from public.messes where invite_code = normalized_code;
  if not found then raise exception 'Mess code was not found'; end if;
  update public.profiles set mess_id = target_mess.id, role = 'member', updated_at = now() where id = auth.uid();
  return target_mess;
end;
$$;

create or replace function public.has_legacy_data()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.members where user_id = auth.uid() and mess_id is null)
      or exists (select 1 from public.cycles where user_id = auth.uid() and mess_id is null)
      or exists (select 1 from public.expenses where user_id = auth.uid() and mess_id is null)
      or exists (select 1 from public.meal_logs where user_id = auth.uid() and mess_id is null)
      or exists (select 1 from public.cycle_deposits where user_id = auth.uid() and mess_id is null)
      or exists (select 1 from public.changelog_entries where user_id = auth.uid() and mess_id is null)
      or exists (select 1 from public.notices where user_id = auth.uid() and mess_id is null)
      or exists (select 1 from public.share_links where user_id = auth.uid() and mess_id is null)
$$;

create or replace function public.migrate_legacy_data(mess_name text)
returns public.messes
language plpgsql
security definer set search_path = public
as $$
declare created_mess public.messes;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if not public.has_legacy_data() then raise exception 'No legacy data is available to migrate'; end if;
  select * into created_mess from public.create_mess(mess_name);
  update public.members set mess_id = created_mess.id, profile_id = null where user_id = auth.uid() and mess_id is null;
  update public.cycles set mess_id = created_mess.id, profile_id = auth.uid() where user_id = auth.uid() and mess_id is null;
  update public.expenses set mess_id = created_mess.id, profile_id = auth.uid() where user_id = auth.uid() and mess_id is null;
  update public.meal_logs set mess_id = created_mess.id, profile_id = auth.uid() where user_id = auth.uid() and mess_id is null;
  update public.cycle_deposits set mess_id = created_mess.id, profile_id = auth.uid() where user_id = auth.uid() and mess_id is null;
  update public.changelog_entries set mess_id = created_mess.id, profile_id = auth.uid() where user_id = auth.uid() and mess_id is null;
  update public.notices set mess_id = created_mess.id, profile_id = auth.uid() where user_id = auth.uid() and mess_id is null;
  update public.share_links set mess_id = created_mess.id, profile_id = auth.uid() where user_id = auth.uid() and mess_id is null;
  update public.push_subscriptions set mess_id = created_mess.id, profile_id = auth.uid() where user_id = auth.uid() and mess_id is null;
  update public.notification_deliveries set mess_id = created_mess.id, profile_id = auth.uid() where user_id = auth.uid() and mess_id is null;
  return created_mess;
end;
$$;

-- A linked profile can appear only once in each mess roster.

create or replace function public.guard_member_profile_link()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.profile_id is distinct from old.profile_id then
    if not public.is_current_mess_manager() then raise exception 'Only a mess manager can link member profiles'; end if;
    if new.profile_id is not null and not exists (select 1 from public.profiles where id = new.profile_id and mess_id = old.mess_id) then raise exception 'Profile must belong to this mess'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_member_profile_link on public.members;
create trigger enforce_member_profile_link before update of profile_id on public.members for each row execute procedure public.guard_member_profile_link();
drop policy if exists own_manage_share_links on public.share_links;
create policy mess_share_links on public.share_links for all to authenticated using (mess_id = public.current_mess_id()) with check (mess_id = public.current_mess_id());

create or replace function public.link_member_profile(member_id_input uuid, profile_id_input uuid)
returns public.members
language plpgsql
security definer set search_path = public
as $$
declare linked_member public.members;
begin
  if not public.is_current_mess_manager() then raise exception 'Only a mess manager can link member profiles'; end if;
  update public.members set profile_id = profile_id_input where id = member_id_input and mess_id = public.current_mess_id() returning * into linked_member;
  if not found then raise exception 'Member was not found in your mess'; end if;
  return linked_member;
end;
$$;

create unique index if not exists members_mess_profile_unique_idx on public.members(mess_id, profile_id) where profile_id is not null;

-- Shared cycles are unique per mess, not per account.
drop index if exists public.cycles_one_active_per_user_idx;
drop index if exists public.cycles_one_pending_per_user_idx;
drop index if exists public.cycles_user_name_unique_idx;
create unique index if not exists cycles_one_active_per_mess_idx on public.cycles(mess_id) where status = 'active';
create unique index if not exists cycles_one_pending_per_mess_idx on public.cycles(mess_id) where status = 'pending';
create unique index if not exists cycles_mess_name_unique_idx on public.cycles(mess_id, lower(name)) where mess_id is not null;

-- Replace single-user policies with active-mess access. user_id remains audit data.
drop policy if exists own_members on public.members;
create policy mess_members on public.members for all to authenticated using (mess_id = public.current_mess_id()) with check (mess_id = public.current_mess_id());
drop policy if exists own_expenses on public.expenses;
create policy mess_expenses on public.expenses for all to authenticated using (mess_id = public.current_mess_id()) with check (mess_id = public.current_mess_id());
drop policy if exists own_meal_logs on public.meal_logs;
create policy mess_meal_logs on public.meal_logs for all to authenticated using (mess_id = public.current_mess_id()) with check (mess_id = public.current_mess_id());
drop policy if exists own_cycles on public.cycles;
create policy mess_cycles on public.cycles for all to authenticated using (mess_id = public.current_mess_id()) with check (mess_id = public.current_mess_id());
drop policy if exists own_cycle_deposits on public.cycle_deposits;
create policy mess_cycle_deposits on public.cycle_deposits for all to authenticated using (mess_id = public.current_mess_id()) with check (mess_id = public.current_mess_id());
drop policy if exists own_changelog_entries on public.changelog_entries;
create policy mess_changelog_entries on public.changelog_entries for all to authenticated using (mess_id = public.current_mess_id()) with check (mess_id = public.current_mess_id());
drop policy if exists "owner can manage notices" on public.notices;
create policy mess_notices on public.notices for all to authenticated using (mess_id = public.current_mess_id()) with check (mess_id = public.current_mess_id());

drop policy if exists "mess members can read profiles" on public.profiles;
create policy "mess members can read profiles" on public.profiles for select to authenticated using (mess_id = public.current_mess_id());

revoke all on function public.join_mess(text), public.has_legacy_data(), public.migrate_legacy_data(text), public.link_member_profile(uuid, uuid) from public;
grant execute on function public.join_mess(text), public.has_legacy_data(), public.migrate_legacy_data(text), public.link_member_profile(uuid, uuid) to authenticated;
