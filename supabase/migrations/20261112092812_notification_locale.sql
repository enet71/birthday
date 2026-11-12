-- Birthday notifications in the user's language. The browser stores the language of the app when notifications are
-- turned on, when the settings are saved, and when the language differs while the Settings page is open.

-- A constant default adds the column without rewriting the table; existing users keep English until the app updates it.
alter table public.notification_settings
  add column locale text not null default 'en' check (locale in ('en', 'es', 'de', 'fr', 'ru', 'uk'));

-- The return type changes, so the function is created again with the same body plus the language.
drop function public.claim_due_birthday_notifications(integer);

-- Claims up to `batch_size` due users and returns their settings. The claim comes first, so overlapping runs never
-- notify a user twice; the Edge Function claims in small batches, so a run that stops early loses at most one batch,
-- and the users it did not claim are picked up by the next run.
create function public.claim_due_birthday_notifications(batch_size integer default 50)
returns table (user_id uuid, local_date date, remind_on_day boolean, remind_day_before boolean, locale text)
language sql
set search_path = ''
as $$
  delete from public.notification_deliveries where local_date < current_date - 7;

  with claimed as (
    insert into public.notification_deliveries (user_id, local_date)
    select due.user_id, due.local_date from public.due_birthday_notifications() due limit batch_size
    on conflict do nothing
    returning notification_deliveries.user_id, notification_deliveries.local_date
  )
  select claimed.user_id, claimed.local_date, settings.remind_on_day, settings.remind_day_before, settings.locale
  from claimed
  join public.notification_settings settings on settings.user_id = claimed.user_id;
$$;

revoke execute on function public.claim_due_birthday_notifications(integer) from public, anon, authenticated, service_role;
grant execute on function public.claim_due_birthday_notifications(integer) to service_role;
