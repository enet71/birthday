create extension if not exists pg_net with schema extensions;

-- Sends every birthday change of a user with a connected Google Calendar to the `google-calendar-push` Edge Function.
-- The project URL and the secret key come from Vault (`project_url`, `edge_functions_secret_key`), so they stay out
-- of the repository. `pg_net` sends the request after the transaction commits and does not slow the change down.
-- `pg_net` does not retry: a change that fails to reach Google stays missing until the next full reconcile (on
-- reconnecting, when the calendar is created again, and, from the import subtask on, on "Sync now").
create function public.push_birthday_change_to_google_calendar()
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

revoke execute on function public.push_birthday_change_to_google_calendar() from public, anon, authenticated;

create trigger push_birthday_change_to_google_calendar
  after insert or update or delete on public.birthdays
  for each row
  execute function public.push_birthday_change_to_google_calendar();
