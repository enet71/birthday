-- Birthdays are exported as Google birthday events into the user's primary calendar instead of a separate "Birthdly"
-- calendar, so the calendar id and its sync token are no longer needed.
alter table public.google_calendar_connections
  drop column calendar_id,
  drop column events_sync_token;

-- The id of the birthday's current event in Google. Google never lets a deleted event id be used again, so a birthday
-- whose event was deleted (by the user, on linking to a contact, on disconnecting) gets an event with a new id.
alter table public.birthdays
  add column google_event_id text;

-- Orphan checks look events up by id across all users.
create index birthdays_google_event_id_idx on public.birthdays (google_event_id) where google_event_id is not null;

-- The new scopes need a new consent; the card then offers "Reconnect".
update public.google_calendar_connections set status = 'revoked' where status = 'connected';
