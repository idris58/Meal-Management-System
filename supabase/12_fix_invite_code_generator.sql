-- Fix for Supabase projects where pgcrypto/gen_random_bytes is not installed.
-- Uses only PostgreSQL built-ins to generate 6-character uppercase codes.

create or replace function public.create_mess(mess_name text)
returns public.messes
language plpgsql
security definer set search_path = public
as $$
declare
  new_mess public.messes;
  new_invite_code char(6);
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to create a mess';
  end if;

  if nullif(trim(mess_name), '') is null then
    raise exception 'Mess name is required';
  end if;

  loop
    select string_agg(
      substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', floor(random() * 36)::integer + 1, 1),
      ''
    )::char(6)
    into new_invite_code
    from generate_series(1, 6);

    begin
      insert into public.messes (name, invite_code, creator_id)
      values (trim(mess_name), new_invite_code, auth.uid())
      returning * into new_mess;
      exit;
    exception when unique_violation then
      if exists (select 1 from public.messes where invite_code = new_invite_code) then
        continue;
      end if;
      raise;
    end;
  end loop;

  update public.profiles
  set mess_id = new_mess.id,
      role = 'manager',
      updated_at = now()
  where id = auth.uid();

  return new_mess;
end;
$$;
