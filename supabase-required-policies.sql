-- ReffGuard required Supabase policies and helpers
-- Run in Supabase SQL Editor if admin role changes, direct delegations or approved-delegation views do not work.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Users can read profiles; users can update own profile; admins can update roles/profiles.
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_select_authenticated" on public.users;
drop policy if exists "users_update_own" on public.users;
drop policy if exists "users_update_own_or_admin" on public.users;

create policy "users_select_authenticated"
on public.users
for select
to authenticated
using (true);

create policy "users_update_own_or_admin"
on public.users
for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

-- Applications: users insert own applications; admins can create direct delegations for anyone.
drop policy if exists "applications_insert_admin" on public.applications;
drop policy if exists "applications_insert_own" on public.applications;
drop policy if exists "applications_insert_own_or_admin" on public.applications;

create policy "applications_insert_own_or_admin"
on public.applications
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

-- Applications: users see own; admins see all; authenticated users can see approved delegations.
drop policy if exists "applications_select_own_or_admin" on public.applications;
drop policy if exists "applications_select_demo" on public.applications;

create policy "applications_select_demo"
on public.applications
for select
to authenticated
using (user_id = auth.uid() or public.is_admin() or status = 'approved');

-- Applications update/delete.
drop policy if exists "applications_update_own_or_admin" on public.applications;
drop policy if exists "applications_delete_own_or_admin" on public.applications;

create policy "applications_update_own_or_admin"
on public.applications
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "applications_delete_own_or_admin"
on public.applications
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Optional: automatically recalculate match status.
create or replace function public.recalculate_match_status(p_match_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_needed_refs integer;
  v_active_count integer;
  v_approved_count integer;
  v_next_status text;
begin
  select needed_refs into v_needed_refs from public.matches where id = p_match_id;
  if v_needed_refs is null then return; end if;

  select count(*) into v_active_count from public.applications where match_id = p_match_id and status <> 'rejected';
  select count(*) into v_approved_count from public.applications where match_id = p_match_id and status = 'approved';

  if v_approved_count >= v_needed_refs then
    v_next_status := 'confirmed';
  elsif v_active_count >= v_needed_refs then
    v_next_status := 'full';
  else
    v_next_status := 'open';
  end if;

  update public.matches set status = v_next_status where id = p_match_id;
end;
$$;

create or replace function public.handle_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_match_status(old.match_id);
    return old;
  end if;
  perform public.recalculate_match_status(new.match_id);
  return new;
end;
$$;

drop trigger if exists trg_application_status_insert on public.applications;
drop trigger if exists trg_application_status_update on public.applications;
drop trigger if exists trg_application_status_delete on public.applications;

create trigger trg_application_status_insert after insert on public.applications for each row execute function public.handle_application_status_change();
create trigger trg_application_status_update after update on public.applications for each row execute function public.handle_application_status_change();
create trigger trg_application_status_delete after delete on public.applications for each row execute function public.handle_application_status_change();
