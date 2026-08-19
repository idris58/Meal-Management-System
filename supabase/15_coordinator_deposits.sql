-- Allow managers and coordinators to manage deposits
drop policy if exists deposits_manage on public.cycle_deposits;
create policy deposits_manage on public.cycle_deposits
  for all to authenticated
  using (mess_id = public.current_mess_id() and public.has_mess_role(array['manager','coordinator']))
  with check (mess_id = public.current_mess_id() and public.has_mess_role(array['manager','coordinator']));
