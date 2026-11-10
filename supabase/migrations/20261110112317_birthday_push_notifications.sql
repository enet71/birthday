-- Browser (Web Push) birthday notifications. The browser keeps its own settings and push subscriptions; every 15
-- minutes `pg_cron` asks the `birthday-notifications-send` Edge Function to notify the users whose chosen hour has
-- come. Running every 15 minutes also covers time zones with a half-hour or 45-minute offset.

create extension if not exists pg_cron;

-- `now() at time zone` fails on an unknown name, which would break the query for everyone.
create function public.is_valid_time_zone(time_zone text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = time_zone);
$$;

-- The check below runs as the role that writes the settings.
revoke execute on function public.is_valid_time_zone(text) from public, anon;
grant execute on function public.is_valid_time_zone(text) to authenticated, service_role;

-- When to notify, per account. Each device that should get notifications has its own push subscription.
create table public.notification_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  remind_on_day boolean not null default true,
  remind_day_before boolean not null default true,
  -- The local hour (0–23) in `time_zone`, the browser's IANA time zone.
  hour smallint not null default 9 check (hour between 0 and 23),
  time_zone text not null check (public.is_valid_time_zone(time_zone)),
  check (remind_on_day or remind_day_before)
);

alter table public.notification_settings enable row level security;

revoke all on table public.notification_settings from anon, authenticated, service_role;
grant select, insert, update, delete on table public.notification_settings to authenticated;
grant select on table public.notification_settings to service_role;

create policy "Users can read their own notification settings"
  on public.notification_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own notification settings"
  on public.notification_settings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own notification settings"
  on public.notification_settings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own notification settings"
  on public.notification_settings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- One row per device and account. A browser shared by two accounts has one row for each. Signing out unsubscribes the
-- browser, and the Edge Function deletes the row once the push service rejects it. Only the push services of the major
-- browsers are accepted, so the Edge Function never sends requests to an address a user made up.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null check (
    length(endpoint) <= 2048
    and endpoint ~ '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)/'
  ),
  p256dh text not null check (length(p256dh) between 1 and 256),
  auth text not null check (length(auth) between 1 and 256),
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

revoke all on table public.push_subscriptions from anon, authenticated, service_role;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant select, delete on table public.push_subscriptions to service_role;

create policy "Users can read their own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- A browser may renew its keys for the same endpoint; the upsert then updates the row.
create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- The local days a user was already notified for, so later runs send nothing twice. Only the Edge Function reads and
-- writes it.
create table public.notification_deliveries (
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  primary key (user_id, local_date)
);

alter table public.notification_deliveries enable row level security;

revoke all on table public.notification_deliveries from anon, authenticated, service_role;
grant select, insert, delete on table public.notification_deliveries to service_role;

-- The users to notify now, with their local date: the local hour is the chosen one, or the next one, which catches a
-- chosen hour skipped by a daylight saving change; the window never crosses midnight, so the local date stays the
-- notified day. Joining the time zone names skips a stored name the database no longer knows instead of failing for
-- everyone. Only users with a device to notify count.
create function public.due_birthday_notifications()
returns table (user_id uuid, local_date date)
language sql
stable
set search_path = ''
as $$
  select settings.user_id, (now() at time zone settings.time_zone)::date
  from public.notification_settings settings
  join pg_catalog.pg_timezone_names zone on zone.name = settings.time_zone
  where extract(hour from now() at time zone settings.time_zone) between settings.hour and least(settings.hour + 1, 23)
    and exists (select 1 from public.push_subscriptions subscription where subscription.user_id = settings.user_id)
    and not exists (
      select 1
      from public.notification_deliveries delivery
      where delivery.user_id = settings.user_id and delivery.local_date = (now() at time zone settings.time_zone)::date
    );
$$;

revoke execute on function public.due_birthday_notifications() from public, anon, authenticated, service_role;
-- The claim runs as `service_role`.
grant execute on function public.due_birthday_notifications() to service_role;

-- Claims up to `batch_size` due users and returns their settings. The claim comes first, so overlapping runs never
-- notify a user twice; the Edge Function claims in small batches, so a run that stops early loses at most one batch,
-- and the users it did not claim are picked up by the next run.
create function public.claim_due_birthday_notifications(batch_size integer default 50)
returns table (user_id uuid, local_date date, remind_on_day boolean, remind_day_before boolean)
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
  select claimed.user_id, claimed.local_date, settings.remind_on_day, settings.remind_day_before
  from claimed
  join public.notification_settings settings on settings.user_id = claimed.user_id;
$$;

revoke execute on function public.claim_due_birthday_notifications(integer) from public, anon, authenticated, service_role;
grant execute on function public.claim_due_birthday_notifications(integer) to service_role;

-- The few birthdays a notification for `local_date` can mention: that day, the next one, and Feb 29, which falls on
-- Feb 28 in other years. The Edge Function picks the exact ones, so it never reads a user's whole list.
create function public.get_notification_birthdays(target_user_id uuid, local_date date)
returns table (name text, birth_date date)
language sql
stable
set search_path = ''
as $$
  select birthday.name, birthday.birth_date
  from public.birthdays birthday
  where birthday.user_id = target_user_id
    and to_char(birthday.birth_date, 'MM-DD') in (to_char(local_date, 'MM-DD'), to_char(local_date + 1, 'MM-DD'), '02-29');
$$;

revoke execute on function public.get_notification_birthdays(uuid, date) from public, anon, authenticated, service_role;
grant execute on function public.get_notification_birthdays(uuid, date) to service_role;

-- Runs from `pg_cron` as `postgres` and calls the Edge Function only when someone is due. The project URL and the
-- secret key come from Vault, as for Google Calendar.
create function public.request_birthday_notifications()
returns void
language plpgsql
set search_path = ''
as $$
declare
  project_url text;
  secret_key text;
begin
  if not exists (select 1 from public.due_birthday_notifications()) then
    return;
  end if;

  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into secret_key from vault.decrypted_secrets where name = 'edge_functions_secret_key';

  if project_url is null or secret_key is null then
    raise warning 'Birthday notifications skipped: the project_url or edge_functions_secret_key Vault secret is missing';
    return;
  end if;

  perform net.http_post(
    url := project_url || '/functions/v1/birthday-notifications-send',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', secret_key),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

revoke execute on function public.request_birthday_notifications() from public, anon, authenticated, service_role;

select cron.schedule('send-birthday-notifications', '*/15 * * * *', 'select public.request_birthday_notifications()');
