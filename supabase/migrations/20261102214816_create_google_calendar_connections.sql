-- One Google Calendar connection per user. The browser only reads its own status; Edge Functions write it.
create table public.google_calendar_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null check (status in ('connected', 'revoked', 'disconnected')),
  -- The "Birthdly" calendar in Google. Kept after disconnecting, so reconnecting reuses it.
  calendar_id text,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);

alter table public.google_calendar_connections enable row level security;

revoke all on table public.google_calendar_connections from anon, authenticated;
grant select on table public.google_calendar_connections to authenticated;
grant select, insert, update, delete on table public.google_calendar_connections to service_role;

create policy "Users can read their own Google Calendar connection"
  on public.google_calendar_connections for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Google refresh tokens live in Vault, one secret per user. Only Edge Functions (service_role) may call these
-- functions: they are `security definer` to reach Vault, so execution is revoked from everyone else.
create function public.set_google_calendar_refresh_token(target_user_id uuid, refresh_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret_name text := 'google_calendar_refresh_token:' || target_user_id;
  secret_id uuid;
begin
  -- Two parallel connects of one user would both miss the secret and fail on its unique name.
  perform pg_advisory_xact_lock(hashtext(secret_name));
  select id into secret_id from vault.secrets where name = secret_name;

  if secret_id is null then
    perform vault.create_secret(refresh_token, secret_name);
  else
    perform vault.update_secret(secret_id, refresh_token);
  end if;
end;
$$;

create function public.get_google_calendar_refresh_token(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'google_calendar_refresh_token:' || target_user_id;
$$;

create function public.delete_google_calendar_refresh_token(target_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from vault.secrets where name = 'google_calendar_refresh_token:' || target_user_id;
$$;

revoke execute on function public.set_google_calendar_refresh_token(uuid, text) from public, anon, authenticated;
revoke execute on function public.get_google_calendar_refresh_token(uuid) from public, anon, authenticated;
revoke execute on function public.delete_google_calendar_refresh_token(uuid) from public, anon, authenticated;
grant execute on function public.set_google_calendar_refresh_token(uuid, text) to service_role;
grant execute on function public.get_google_calendar_refresh_token(uuid) to service_role;
grant execute on function public.delete_google_calendar_refresh_token(uuid) to service_role;

-- Deleting a user cascades to the connection; the token must not outlive it in Vault.
create function public.delete_google_calendar_refresh_token_of_connection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets where name = 'google_calendar_refresh_token:' || old.user_id;
  return old;
end;
$$;

revoke execute on function public.delete_google_calendar_refresh_token_of_connection() from public, anon, authenticated;

create trigger delete_google_calendar_refresh_token
  after delete on public.google_calendar_connections
  for each row
  execute function public.delete_google_calendar_refresh_token_of_connection();
