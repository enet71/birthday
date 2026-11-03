-- Deletions in Google are read from this moment on. It moves only after a sync read them successfully, so a failed
-- sync does not skip deletions. `-infinity` means there is nothing to read yet, for example right after connecting.
alter table public.google_calendar_connections
  add column deletions_checked_at timestamptz not null default '-infinity';
