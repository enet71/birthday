create table public.birthdays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  birth_date date not null,
  created_at timestamptz not null default now()
);

create index birthdays_user_id_idx on public.birthdays (user_id);

alter table public.birthdays enable row level security;

-- New tables are not exposed to the Data API automatically, so grant access explicitly.
grant select, insert, update, delete on table public.birthdays to authenticated;

create policy "Users can read their own birthdays"
  on public.birthdays for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own birthdays"
  on public.birthdays for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own birthdays"
  on public.birthdays for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own birthdays"
  on public.birthdays for delete
  to authenticated
  using ((select auth.uid()) = user_id);
