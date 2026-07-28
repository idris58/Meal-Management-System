-- Step 1: additive multi-mess foundation. Existing rows and user_id ownership
-- remain untouched; mess_id stays null until a mess is explicitly assigned.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'member' check (role in ('member', 'coordinator', 'manager')),
  mess_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_unique_idx on public.profiles(lower(email));

create table if not exists public.messes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  invite_code char(6) not null unique check (invite_code ~ '^[A-Z0-9]{6}$'),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add constraint profiles_mess_id_fkey foreign key (mess_id) references public.messes(id) on delete set null;
create index if not exists profiles_mess_id_idx on public.profiles(mess_id);
create index if not exists messes_creator_id_idx on public.messes(creator_id);

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(trim(new.raw_user_meta_data ->> 'name'), ''), nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(new.email, '@', 1), ''), 'Member'),
    new.email
  )
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_changed on auth.users;
create trigger on_auth_user_profile_changed after insert or update of email, raw_user_meta_data on auth.users for each row execute procedure public.handle_auth_user_profile();

-- Ensure users that existed before this migration receive profiles too.
insert into public.profiles (id, full_name, email)
select id, coalesce(nullif(trim(raw_user_meta_data ->> 'full_name'), ''), nullif(trim(raw_user_meta_data ->> 'name'), ''), nullif(trim(raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(email, '@', 1), ''), 'Member'), email
from auth.users where email is not null
on conflict (id) do update set full_name = excluded.full_name, email = excluded.email, updated_at = now();

-- Add future multi-mess ownership links without removing or changing current data.
alter table public.members add column if not exists mess_id uuid references public.messes(id) on delete set null, add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.cycles add column if not exists mess_id uuid references public.messes(id) on delete set null, add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.expenses add column if not exists mess_id uuid references public.messes(id) on delete set null, add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.meal_logs add column if not exists mess_id uuid references public.messes(id) on delete set null, add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.cycle_deposits add column if not exists mess_id uuid references public.messes(id) on delete set null, add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.changelog_entries add column if not exists mess_id uuid references public.messes(id) on delete set null, add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.notices add column if not exists mess_id uuid references public.messes(id) on delete set null, add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.share_links add column if not exists mess_id uuid references public.messes(id) on delete set null, add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.push_subscriptions add column if not exists mess_id uuid references public.messes(id) on delete set null, add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.notification_deliveries add column if not exists mess_id uuid references public.messes(id) on delete set null, add column if not exists profile_id uuid references public.profiles(id) on delete set null;

-- Existing personal records retain their owner and gain the matching profile link.
update public.members set profile_id = user_id where profile_id is null and user_id is not null;
update public.cycles set profile_id = user_id where profile_id is null and user_id is not null;
update public.expenses set profile_id = user_id where profile_id is null and user_id is not null;
update public.meal_logs set profile_id = user_id where profile_id is null and user_id is not null;
update public.cycle_deposits set profile_id = user_id where profile_id is null and user_id is not null;
update public.changelog_entries set profile_id = user_id where profile_id is null and user_id is not null;
update public.notices set profile_id = user_id where profile_id is null and user_id is not null;
update public.share_links set profile_id = user_id where profile_id is null and user_id is not null;
update public.push_subscriptions set profile_id = user_id where profile_id is null and user_id is not null;
update public.notification_deliveries set profile_id = user_id where profile_id is null and user_id is not null;

create index if not exists members_mess_id_idx on public.members(mess_id); create index if not exists members_profile_id_idx on public.members(profile_id);
create index if not exists cycles_mess_id_idx on public.cycles(mess_id); create index if not exists cycles_profile_id_idx on public.cycles(profile_id);
create index if not exists expenses_mess_id_idx on public.expenses(mess_id); create index if not exists expenses_profile_id_idx on public.expenses(profile_id);
create index if not exists meal_logs_mess_id_idx on public.meal_logs(mess_id); create index if not exists meal_logs_profile_id_idx on public.meal_logs(profile_id);
create index if not exists cycle_deposits_mess_id_idx on public.cycle_deposits(mess_id); create index if not exists cycle_deposits_profile_id_idx on public.cycle_deposits(profile_id);
create index if not exists changelog_entries_mess_id_idx on public.changelog_entries(mess_id); create index if not exists changelog_entries_profile_id_idx on public.changelog_entries(profile_id);
create index if not exists notices_mess_id_idx on public.notices(mess_id); create index if not exists notices_profile_id_idx on public.notices(profile_id);
create index if not exists share_links_mess_id_idx on public.share_links(mess_id); create index if not exists share_links_profile_id_idx on public.share_links(profile_id);
create index if not exists push_subscriptions_mess_id_idx on public.push_subscriptions(mess_id); create index if not exists push_subscriptions_profile_id_idx on public.push_subscriptions(profile_id);
create index if not exists notification_deliveries_mess_id_idx on public.notification_deliveries(mess_id); create index if not exists notification_deliveries_profile_id_idx on public.notification_deliveries(profile_id);

alter table public.profiles enable row level security;
alter table public.messes enable row level security;
drop policy if exists "users can read their own profile" on public.profiles;
create policy "users can read their own profile" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "members can read their mess" on public.messes;
create policy "members can read their mess" on public.messes for select to authenticated using (id = (select mess_id from public.profiles where id = auth.uid()));

-- The creator is recorded as the mess manager and receives a collision-safe six-character invite code.
create or replace function public.create_mess(mess_name text)
returns public.messes language plpgsql security definer set search_path = public
as $$
declare new_mess public.messes; new_invite_code char(6);
begin
  if auth.uid() is null then raise exception 'Authentication is required to create a mess'; end if;
  if nullif(trim(mess_name), '') is null then raise exception 'Mess name is required'; end if;
  loop
    new_invite_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    begin
      insert into public.messes (name, invite_code, creator_id) values (trim(mess_name), new_invite_code, auth.uid()) returning * into new_mess;
      exit;
    exception when unique_violation then
      if exists (select 1 from public.messes where invite_code = new_invite_code) then continue; end if;
      raise;
    end;
  end loop;
  update public.profiles set mess_id = new_mess.id, role = 'manager', updated_at = now() where id = auth.uid();
  return new_mess;
end;
$$;
revoke all on function public.create_mess(text) from public;
grant execute on function public.create_mess(text) to authenticated;
