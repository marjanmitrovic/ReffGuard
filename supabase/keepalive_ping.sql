create table if not exists public.keepalive_ping (
  id integer primary key,
  project text not null default 'ReffGuard',
  touched_at timestamptz not null default now()
);

alter table public.keepalive_ping enable row level security;

drop policy if exists "keepalive_ping_select" on public.keepalive_ping;
drop policy if exists "keepalive_ping_insert" on public.keepalive_ping;
drop policy if exists "keepalive_ping_update" on public.keepalive_ping;

create policy "keepalive_ping_select"
on public.keepalive_ping
for select
to anon
using (true);

create policy "keepalive_ping_insert"
on public.keepalive_ping
for insert
to anon
with check (id = 1 and project = 'ReffGuard');

create policy "keepalive_ping_update"
on public.keepalive_ping
for update
to anon
using (id = 1 and project = 'ReffGuard')
with check (id = 1 and project = 'ReffGuard');

grant select, insert, update on public.keepalive_ping to anon;
grant select, insert, update on public.keepalive_ping to authenticated;

insert into public.keepalive_ping (id, project, touched_at)
values (1, 'ReffGuard', now())
on conflict (id) do update set touched_at = excluded.touched_at;
