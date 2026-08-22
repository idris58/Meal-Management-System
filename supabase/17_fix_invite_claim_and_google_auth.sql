-- Allow the invite acceptance RPC to link the currently authenticated,
-- mess-less profile without weakening the manager-only direct-link policy.
create or replace function public.guard_member_profile_link()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare self_claim boolean;
begin
  if new.profile_id is distinct from old.profile_id then
    self_claim := new.profile_id = auth.uid()
      and old.profile_id is null
      and exists (select 1 from public.profiles where id = auth.uid() and mess_id is null);

    if not public.is_current_mess_manager() and not self_claim then
      raise exception 'Only a mess manager can link member profiles';
    end if;

    if new.profile_id is not null
      and not exists (select 1 from public.profiles where id = new.profile_id and mess_id = old.mess_id)
      and not self_claim then
      raise exception 'Profile must belong to this mess';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_member_profile_link on public.members;
create trigger enforce_member_profile_link
before update of profile_id on public.members
for each row execute procedure public.guard_member_profile_link();
