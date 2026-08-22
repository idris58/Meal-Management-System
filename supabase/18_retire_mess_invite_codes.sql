-- Invite links are now the only supported path into an existing mess.

create or replace function public.create_mess(mess_name text)
returns public.messes
language plpgsql security definer set search_path = public
as $$
declare new_mess public.messes;
begin
  if auth.uid() is null then raise exception 'Authentication is required to create a mess'; end if;
  if nullif(trim(mess_name), '') is null then raise exception 'Mess name is required'; end if;

  insert into public.messes (name, creator_id)
  values (trim(mess_name), auth.uid())
  returning * into new_mess;

  update public.profiles
  set mess_id = new_mess.id, role = 'manager', updated_at = now()
  where id = auth.uid();
  return new_mess;
end;
$$;

revoke all on function public.join_mess(text) from public;
drop function if exists public.join_mess(text);
alter table public.messes drop column if exists invite_code;
