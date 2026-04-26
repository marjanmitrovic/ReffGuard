
-- ReffGuard multi-podsavez + FAČR ID migration
-- Run this whole file in Supabase SQL Editor.
-- It adds organizations, FAČR ID registration status, organization isolation and helper RLS policies.

-- 1) Organizations / podsavezy
create table if not exists public.organizations (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text unique,
  created_at timestamptz not null default now()
);

insert into public.organizations (name, slug)
values
  ('OFS Praha-východ', 'ofs-praha-vychod'),
  ('OFS Kolín', 'ofs-kolin'),
  ('OFS Benešov', 'ofs-benesov'),
  ('OFS Kladno', 'ofs-kladno')
on conflict (name) do nothing;

-- Optional whitelist table. If you later import real FAČR lists, keep facr_id unique.
create table if not exists public.facr_referees (
  id bigint generated always as identity primary key,
  facr_id text not null unique,
  full_name text,
  organization_id bigint references public.organizations(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Extend users and matches
alter table public.users add column if not exists organization_id bigint references public.organizations(id) on delete set null;
alter table public.users add column if not exists facr_id text;
alter table public.users add column if not exists registration_status text not null default 'pending'
  check (registration_status in ('pending', 'approved', 'rejected'));

alter table public.matches add column if not exists organization_id bigint references public.organizations(id) on delete cascade;

-- Make facr_id unique when present.
create unique index if not exists users_facr_id_unique_idx on public.users (facr_id) where facr_id is not null;
create index if not exists users_organization_idx on public.users (organization_id);
create index if not exists matches_organization_idx on public.matches (organization_id);

-- Backfill missing organization_id with first organization, so old pilot data keeps working.
with first_org as (select id from public.organizations order by id limit 1)
update public.users set organization_id = (select id from first_org) where organization_id is null;
with first_org as (select id from public.organizations order by id limit 1)
update public.matches set organization_id = (select id from first_org) where organization_id is null;

-- Existing admins should stay usable.
update public.users set registration_status = 'approved' where role = 'admin';

-- 3) Auth trigger: profile is created from signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id bigint;
  v_facr_id text;
  v_full_name text;
begin
  v_org_id := nullif(new.raw_user_meta_data->>'organization_id', '')::bigint;
  v_facr_id := nullif(trim(new.raw_user_meta_data->>'facr_id'), '');
  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1));

  insert into public.users (id, full_name, role, email, organization_id, facr_id, registration_status)
  values (new.id, v_full_name, 'referee', new.email, v_org_id, v_facr_id, 'pending')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 4) Helper functions avoid RLS recursion.
create or replace function public.current_organization_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'admin'
      and registration_status = 'approved'
  );
$$;

create or replace function public.is_approved_referee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'referee'
      and registration_status = 'approved'
  );
$$;

create or replace function public.match_in_current_org(p_match_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id
      and m.organization_id = public.current_organization_id()
  );
$$;

revoke all on function public.current_organization_id() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_approved_referee() from public;
revoke all on function public.match_in_current_org(bigint) from public;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_approved_referee() to authenticated;
grant execute on function public.match_in_current_org(bigint) to authenticated;

-- 5) Enable RLS
alter table public.organizations enable row level security;
alter table public.facr_referees enable row level security;
alter table public.users enable row level security;
alter table public.matches enable row level security;
alter table public.applications enable row level security;

-- 6) Drop old policies
-- organizations
drop policy if exists "organizations_select_authenticated" on public.organizations;
-- facr_referees
drop policy if exists "facr_referees_select_same_org_admin" on public.facr_referees;
drop policy if exists "facr_referees_all_admin_same_org" on public.facr_referees;
-- users
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_select_authenticated" on public.users;
drop policy if exists "users_select_same_org" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;
drop policy if exists "users_update_own_or_admin" on public.users;
-- matches
drop policy if exists "matches_select_authenticated" on public.matches;
drop policy if exists "matches_select_same_org" on public.matches;
drop policy if exists "matches_insert_admin" on public.matches;
drop policy if exists "matches_update_admin" on public.matches;
drop policy if exists "matches_delete_admin" on public.matches;
-- applications
drop policy if exists "applications_select_own_or_admin" on public.applications;
drop policy if exists "applications_select_demo" on public.applications;
drop policy if exists "applications_select_same_org" on public.applications;
drop policy if exists "applications_insert_own" on public.applications;
drop policy if exists "applications_insert_admin" on public.applications;
drop policy if exists "applications_insert_own_or_admin" on public.applications;
drop policy if exists "applications_update_own_or_admin" on public.applications;
drop policy if exists "applications_delete_own_or_admin" on public.applications;

-- 7) New policies
create policy "organizations_select_authenticated"
on public.organizations
for select
to anon, authenticated
using (true);

create policy "facr_referees_select_same_org_admin"
on public.facr_referees
for select
to authenticated
using (public.is_admin() and organization_id = public.current_organization_id());

create policy "facr_referees_all_admin_same_org"
on public.facr_referees
for all
to authenticated
using (public.is_admin() and organization_id = public.current_organization_id())
with check (public.is_admin() and organization_id = public.current_organization_id());

create policy "users_select_same_org"
on public.users
for select
to authenticated
using (
  id = auth.uid()
  or organization_id = public.current_organization_id()
);

create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (id = auth.uid());

create policy "users_update_own_or_admin"
on public.users
for update
to authenticated
using (
  id = auth.uid()
  or (public.is_admin() and organization_id = public.current_organization_id())
)
with check (
  id = auth.uid()
  or (public.is_admin() and organization_id = public.current_organization_id())
);

create policy "matches_select_same_org"
on public.matches
for select
to authenticated
using (
  organization_id = public.current_organization_id()
  and (public.is_admin() or public.is_approved_referee())
);

create policy "matches_insert_admin"
on public.matches
for insert
to authenticated
with check (public.is_admin() and organization_id = public.current_organization_id());

create policy "matches_update_admin"
on public.matches
for update
to authenticated
using (public.is_admin() and organization_id = public.current_organization_id())
with check (public.is_admin() and organization_id = public.current_organization_id());

create policy "matches_delete_admin"
on public.matches
for delete
to authenticated
using (public.is_admin() and organization_id = public.current_organization_id());

create policy "applications_select_same_org"
on public.applications
for select
to authenticated
using (
  user_id = auth.uid()
  or (public.is_admin() and public.match_in_current_org(match_id))
  or (status = 'approved' and public.match_in_current_org(match_id))
);

create policy "applications_insert_own_or_admin"
on public.applications
for insert
to authenticated
with check (
  (
    user_id = auth.uid()
    and public.is_approved_referee()
    and public.match_in_current_org(match_id)
  )
  or (
    public.is_admin()
    and public.match_in_current_org(match_id)
  )
);

create policy "applications_update_own_or_admin"
on public.applications
for update
to authenticated
using (
  user_id = auth.uid()
  or (public.is_admin() and public.match_in_current_org(match_id))
)
with check (
  user_id = auth.uid()
  or (public.is_admin() and public.match_in_current_org(match_id))
);

create policy "applications_delete_own_or_admin"
on public.applications
for delete
to authenticated
using (
  user_id = auth.uid()
  or (public.is_admin() and public.match_in_current_org(match_id))
);

-- 8) Status recalculation triggers
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

-- 9) Conflict protection in database too.
create or replace function public.prevent_approved_referee_time_conflict()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflict_exists boolean;
begin
  if new.status <> 'approved' then return new; end if;

  select exists (
    select 1
    from public.applications a
    join public.matches existing_match on existing_match.id = a.match_id
    join public.matches new_match on new_match.id = new.match_id
    where a.user_id = new.user_id
      and a.status = 'approved'
      and a.id <> coalesce(new.id, -1)
      and existing_match.organization_id = new_match.organization_id
      and existing_match.match_date = new_match.match_date
      and existing_match.match_time = new_match.match_time
  ) into v_conflict_exists;

  if v_conflict_exists then
    raise exception 'Tento rozhodčí už má potvrzenou delegaci ve stejný datum a čas.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_approved_referee_time_conflict_insert on public.applications;
drop trigger if exists trg_prevent_approved_referee_time_conflict_update on public.applications;
create trigger trg_prevent_approved_referee_time_conflict_insert before insert on public.applications for each row execute function public.prevent_approved_referee_time_conflict();
create trigger trg_prevent_approved_referee_time_conflict_update before update of status, user_id, match_id on public.applications for each row execute function public.prevent_approved_referee_time_conflict();
