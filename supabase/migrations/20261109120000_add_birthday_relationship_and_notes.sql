-- Both are optional and stay in the app: Google sync reads only the name and the date.
alter table public.birthdays
  add column relationship text check (relationship in ('family', 'friends', 'colleagues', 'other')),
  add column notes text check (length(notes) <= 500);

-- The browser writes only the columns the user edits; the sync columns stay with the Edge Functions.
grant insert (relationship, notes), update (relationship, notes) on table public.birthdays to authenticated;
