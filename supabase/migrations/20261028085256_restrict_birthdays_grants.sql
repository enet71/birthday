-- The project still auto-grants every privilege on new public tables; keep only what the app needs.
revoke all on table public.birthdays from anon, authenticated;
grant select, insert, update, delete on table public.birthdays to authenticated;
