-- ReffGuard Pro: Středočeský kraj OFS seed
-- Run this once in Supabase SQL Editor.
-- The registration/admin dropdown reads from public.organizations.

insert into public.organizations (name, slug)
values
  ('OFS Benešov', 'ofs-benesov'),
  ('OFS Beroun', 'ofs-beroun'),
  ('OFS Kladno', 'ofs-kladno'),
  ('OFS Kolín', 'ofs-kolin'),
  ('OFS Kutná Hora', 'ofs-kutna-hora'),
  ('OFS Mělník', 'ofs-melnik'),
  ('OFS Mladá Boleslav', 'ofs-mlada-boleslav'),
  ('OFS Nymburk', 'ofs-nymburk'),
  ('OFS Praha-východ', 'ofs-praha-vychod'),
  ('OFS Praha-západ', 'ofs-praha-zapad'),
  ('OFS Příbram', 'ofs-pribram'),
  ('OFS Rakovník', 'ofs-rakovnik')
on conflict (slug) do update
set name = excluded.name;

-- Verification:
-- select id, name, slug from public.organizations order by name;
