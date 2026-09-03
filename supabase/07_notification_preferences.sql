-- Per-user local schedule for meal-log push reminders.
alter table public.profiles
  add column if not exists reminder_time time not null default '22:00',
  add column if not exists reminder_timezone text not null default 'Asia/Dhaka';

create or replace function public.get_notification_preferences()
returns table (reminder_time time, reminder_timezone text)
language sql stable security definer set search_path = public
as $$
  select p.reminder_time, p.reminder_timezone
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.update_notification_preferences(
  reminder_time_input time,
  reminder_timezone_input text
)
returns table (reminder_time time, reminder_timezone text)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if reminder_timezone_input is null or length(trim(reminder_timezone_input)) = 0 then
    raise exception 'Timezone is required';
  end if;
  if not exists (select 1 from pg_timezone_names where name = trim(reminder_timezone_input)) then
    raise exception 'Invalid timezone';
  end if;
  update public.profiles
    set reminder_time = coalesce(reminder_time_input, '22:00'::time),
        reminder_timezone = trim(reminder_timezone_input),
        updated_at = now()
    where id = auth.uid();
  if not found then raise exception 'Profile was not found'; end if;
  return query select p.reminder_time, p.reminder_timezone from public.profiles p where p.id = auth.uid();
end;
$$;

grant execute on function public.get_notification_preferences() to authenticated;
grant execute on function public.update_notification_preferences(time, text) to authenticated;
