create table if not exists public.keepalive_ping (
  id integer primary key,
  project text not null default 'ReffGuardPro',
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
with check (id = 1 and project in ('ReffGuard', 'ReffGuardPro'));

create policy "keepalive_ping_update"
on public.keepalive_ping
for update
to anon
using (id = 1 and project in ('ReffGuard', 'ReffGuardPro'))
with check (id = 1 and project in ('ReffGuard', 'ReffGuardPro'));

grant select, insert, update on public.keepalive_ping to anon;
grant select, insert, update on public.keepalive_ping to authenticated;

insert into public.keepalive_ping (id, project, touched_at)
values (1, 'ReffGuardPro', now())
on conflict (id) do update set project = excluded.project, touched_at = excluded.touched_at;
