-- Per-user schedule for meal-log push reminders (Asia/Dhaka).
alter table public.profiles
  add column if not exists reminder_time time not null default '22:00';

create or replace function public.get_notification_preferences()
returns table (reminder_time time)
language sql stable security definer set search_path = public
as $$
  select p.reminder_time
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.update_notification_preferences(reminder_time_input time)
returns table (reminder_time time)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  update public.profiles
    set reminder_time = coalesce(reminder_time_input, '22:00'::time),
        updated_at = now()
    where id = auth.uid();
  if not found then raise exception 'Profile was not found'; end if;
  return query select p.reminder_time from public.profiles p where p.id = auth.uid();
end;
$$;

grant execute on function public.get_notification_preferences() to authenticated;
grant execute on function public.update_notification_preferences(time) to authenticated;
