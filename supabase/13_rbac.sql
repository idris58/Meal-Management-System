-- Step 3: database-enforced role-based access control.

create or replace function public.current_mess_role()
returns text
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.has_mess_role(allowed_roles text[])
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_mess_role() = any(allowed_roles) $$;

create or replace function public.set_mess_role(profile_id_input uuid, role_input text)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare updated_profile public.profiles;
begin
  if not public.is_current_mess_manager() then raise exception 'Only a manager can change roles'; end if;
  if role_input not in ('member', 'coordinator') then raise exception 'Role must be member or coordinator'; end if;
  update public.profiles set role = role_input, updated_at = now()
  where id = profile_id_input and mess_id = public.current_mess_id()
  returning * into updated_profile;
  if not found then raise exception 'Profile is not a member of this mess'; end if;
  return updated_profile;
end;
$$;

create or replace function public.update_mess_settings(mess_name text)
returns public.messes
language plpgsql security definer set search_path = public
as $$
declare updated_mess public.messes;
begin
  if not public.is_current_mess_manager() then raise exception 'Only a manager can edit mess settings'; end if;
  if nullif(trim(mess_name), '') is null then raise exception 'Mess name is required'; end if;
  update public.messes set name = trim(mess_name), updated_at = now()
  where id = public.current_mess_id() returning * into updated_mess;
  return updated_mess;
end;
$$;

create or replace function public.delete_current_mess()
returns void
language plpgsql security definer set search_path = public
as $$
declare target_mess_id uuid := public.current_mess_id();
begin
  if not public.is_current_mess_manager() then raise exception 'Only a manager can delete a mess'; end if;
  if target_mess_id is null then raise exception 'No active mess'; end if;
  delete from public.notification_deliveries where mess_id = target_mess_id;
  delete from public.push_subscriptions where mess_id = target_mess_id;
  delete from public.notices where mess_id = target_mess_id;
  delete from public.share_links where mess_id = target_mess_id;
  delete from public.changelog_entries where mess_id = target_mess_id;
  delete from public.cycle_deposits where mess_id = target_mess_id;
  delete from public.meal_logs where mess_id = target_mess_id;
  delete from public.expenses where mess_id = target_mess_id;
  delete from public.cycles where mess_id = target_mess_id;
  delete from public.members where mess_id = target_mess_id;
  update public.profiles set mess_id = null, role = 'member', updated_at = now() where mess_id = target_mess_id;
  delete from public.messes where id = target_mess_id;
end;
$$;

-- Replace broad Step 2 policies with role-specific policies.
drop policy if exists mess_members on public.members;
create policy members_read on public.members for select to authenticated using (mess_id = public.current_mess_id());
create policy members_manage on public.members for all to authenticated using (mess_id = public.current_mess_id() and public.has_mess_role(array['manager'])) with check (mess_id = public.current_mess_id() and public.has_mess_role(array['manager']));

drop policy if exists mess_expenses on public.expenses;
create policy expenses_read on public.expenses for select to authenticated using (mess_id = public.current_mess_id());
create policy expenses_operate on public.expenses for all to authenticated using (mess_id = public.current_mess_id() and public.has_mess_role(array['manager','coordinator'])) with check (mess_id = public.current_mess_id() and public.has_mess_role(array['manager','coordinator']));

drop policy if exists mess_meal_logs on public.meal_logs;
create policy meal_logs_read on public.meal_logs for select to authenticated using (mess_id = public.current_mess_id());
create policy meal_logs_operate on public.meal_logs for all to authenticated using (mess_id = public.current_mess_id() and public.has_mess_role(array['manager','coordinator'])) with check (mess_id = public.current_mess_id() and public.has_mess_role(array['manager','coordinator']));

drop policy if exists mess_cycle_deposits on public.cycle_deposits;
create policy deposits_read on public.cycle_deposits for select to authenticated using (mess_id = public.current_mess_id());
create policy deposits_manage on public.cycle_deposits for all to authenticated using (mess_id = public.current_mess_id() and public.has_mess_role(array['manager'])) with check (mess_id = public.current_mess_id() and public.has_mess_role(array['manager']));

drop policy if exists mess_cycles on public.cycles;
create policy cycles_read on public.cycles for select to authenticated using (mess_id = public.current_mess_id());
create policy cycles_manage on public.cycles for all to authenticated using (mess_id = public.current_mess_id() and public.has_mess_role(array['manager'])) with check (mess_id = public.current_mess_id() and public.has_mess_role(array['manager']));

drop policy if exists mess_changelog_entries on public.changelog_entries;
create policy changelog_read on public.changelog_entries for select to authenticated using (mess_id = public.current_mess_id());
create policy changelog_operate on public.changelog_entries for insert to authenticated with check (mess_id = public.current_mess_id() and public.has_mess_role(array['manager','coordinator']));

drop policy if exists mess_notices on public.notices;
create policy notices_read on public.notices for select to authenticated using (mess_id = public.current_mess_id());
create policy notices_manage on public.notices for all to authenticated using (mess_id = public.current_mess_id() and public.has_mess_role(array['manager'])) with check (mess_id = public.current_mess_id() and public.has_mess_role(array['manager']));

drop policy if exists mess_share_links on public.share_links;
create policy share_links_read on public.share_links for select to authenticated using (mess_id = public.current_mess_id());
create policy share_links_manage on public.share_links for all to authenticated using (mess_id = public.current_mess_id() and public.has_mess_role(array['manager'])) with check (mess_id = public.current_mess_id() and public.has_mess_role(array['manager']));

drop policy if exists "users can update their own profile" on public.profiles;

revoke all on function public.set_mess_role(uuid, text), public.update_mess_settings(text), public.delete_current_mess() from public;
grant execute on function public.set_mess_role(uuid, text), public.update_mess_settings(text), public.delete_current_mess() to authenticated;
