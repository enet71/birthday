-- `updated_at` lets the Google import keep the later of two changes. `google_contact_id` links a birthday to the
-- Google contact it came from (`people/c123`); Google already shows those birthdays, so they are not exported.
-- `google_contact_snapshot` is the contact's birthday as last imported, so only a change of it in Google, not of
-- any other contact field, is applied.
alter table public.birthdays
  add column updated_at timestamptz not null default now(),
  add column google_contact_id text,
  add column google_contact_snapshot text;

-- Not partial, so imports can upsert on it; several NULLs never conflict.
create unique index birthdays_user_id_google_contact_id_idx on public.birthdays (user_id, google_contact_id);

create function public.set_birthday_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_birthday_updated_at
  before update on public.birthdays
  for each row
  execute function public.set_birthday_updated_at();

-- The browser writes only the name and the date; the sync columns belong to the Edge Functions.
revoke insert, update on table public.birthdays from authenticated;
grant insert (name, birth_date), update (name, birth_date) on table public.birthdays to authenticated;

-- `events_sync_token` continues the incremental read of the "Birthdly" calendar. `last_pulled_at` limits automatic
-- imports to one per hour across all devices, and `sync_running_until` keeps two imports of one user from overlapping.
alter table public.google_calendar_connections
  add column events_sync_token text,
  add column last_pulled_at timestamptz not null default '-infinity',
  add column sync_running_until timestamptz not null default '-infinity';

-- Same as before, but skips changes that cannot affect the "Birthdly" calendar: a contact birthday has no event
-- there, and an update of sync columns alone changes nothing that Google shows.
create or replace function public.push_birthday_change_to_google_calendar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_user_id uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  project_url text;
  secret_key text;
begin
  if tg_op = 'INSERT' and new.google_contact_id is not null then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.google_contact_id is not null and new.google_contact_id is not null then
    return null;
  end if;
  if tg_op = 'UPDATE'
    and new.name = old.name
    and new.birth_date = old.birth_date
    and new.google_contact_id is not distinct from old.google_contact_id then
    return null;
  end if;
  if not exists (
    select 1 from public.google_calendar_connections where user_id = changed_user_id and status = 'connected'
  ) then
    return null;
  end if;

  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into secret_key from vault.decrypted_secrets where name = 'edge_functions_secret_key';

  if project_url is null or secret_key is null then
    raise warning 'Google Calendar push skipped: the project_url or edge_functions_secret_key Vault secret is missing';
    return null;
  end if;

  perform net.http_post(
    url := project_url || '/functions/v1/google-calendar-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', secret_key),
    body := jsonb_build_object(
      'type', tg_op,
      'record', case when tg_op = 'DELETE' then null else to_jsonb(new) end,
      'old_record', case when tg_op = 'INSERT' then null else to_jsonb(old) end
    ),
    timeout_milliseconds := 30000
  );

  return null;
end;
$$;
