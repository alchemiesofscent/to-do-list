-- 2026-02-02 — Supabase Auth + RLS + tombstones (soft delete)
--
-- This migration moves the app from a client-side `user_id` filter model to Supabase Auth with
-- RLS based on `auth.uid()` (`owner_id`). The app becomes local-first by default, and cloud sync
-- is enabled only when the user signs in.
--
-- IMPORTANT: Existing rows in `public.tasks` may have a legacy `user_id` namespace and no
-- `owner_id`. They will not be readable via RLS until you "claim" them by setting owner_id.
--
-- Manual claim recipe (run once after signing in; use your auth uid):
--   update public.tasks
--     set owner_id = '<AUTH_UID>'
--   where owner_id is null
--     and user_id = '<LEGACY_NAMESPACE>';
--
-- Optional hardening after claim:
--   alter table public.tasks alter column owner_id set not null;

-- =========
-- tasks (existing)
-- =========
alter table if exists public.tasks
  add column if not exists owner_id uuid,
  add column if not exists deleted_at timestamptz;

alter table if exists public.tasks
  alter column owner_id set default auth.uid();

create index if not exists tasks_owner_id_idx on public.tasks (owner_id);
create index if not exists tasks_owner_id_updated_at_idx on public.tasks (owner_id, updated_at desc);

alter table if exists public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select
  using (owner_id = auth.uid());

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert
  with check (owner_id = auth.uid());

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete
  using (owner_id = auth.uid());

-- =========
-- todo_tasks (new)
-- =========
create table if not exists public.todo_tasks (
  id text primary key,
  owner_id uuid not null default auth.uid(),

  title text not null,
  completed boolean not null default false,
  is_important boolean not null default false,
  due_date date null,
  note text not null default '',
  steps jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null,
  deleted_at timestamptz null
);

create index if not exists todo_tasks_owner_id_idx on public.todo_tasks (owner_id);
create index if not exists todo_tasks_owner_id_updated_at_idx on public.todo_tasks (owner_id, updated_at desc);

alter table if exists public.todo_tasks enable row level security;

drop policy if exists "todo_tasks_select_own" on public.todo_tasks;
create policy "todo_tasks_select_own" on public.todo_tasks
  for select
  using (owner_id = auth.uid());

drop policy if exists "todo_tasks_insert_own" on public.todo_tasks;
create policy "todo_tasks_insert_own" on public.todo_tasks
  for insert
  with check (owner_id = auth.uid());

drop policy if exists "todo_tasks_update_own" on public.todo_tasks;
create policy "todo_tasks_update_own" on public.todo_tasks
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "todo_tasks_delete_own" on public.todo_tasks;
create policy "todo_tasks_delete_own" on public.todo_tasks
  for delete
  using (owner_id = auth.uid());

-- =========
-- my_day_items (new; synced later)
-- =========
create table if not exists public.my_day_items (
  id text primary key,
  owner_id uuid not null default auth.uid(),

  date_utc date not null,
  chunk_id text not null,
  item_type text not null,
  payload jsonb not null,

  status text not null,
  reason_code text null,
  reason_text text null,

  pinned_at_utc timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null,
  deleted_at timestamptz null
);

create index if not exists my_day_items_owner_day_idx on public.my_day_items (owner_id, date_utc);
create index if not exists my_day_items_owner_updated_at_idx on public.my_day_items (owner_id, updated_at desc);

alter table if exists public.my_day_items enable row level security;

drop policy if exists "my_day_items_select_own" on public.my_day_items;
create policy "my_day_items_select_own" on public.my_day_items
  for select
  using (owner_id = auth.uid());

drop policy if exists "my_day_items_insert_own" on public.my_day_items;
create policy "my_day_items_insert_own" on public.my_day_items
  for insert
  with check (owner_id = auth.uid());

drop policy if exists "my_day_items_update_own" on public.my_day_items;
create policy "my_day_items_update_own" on public.my_day_items
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "my_day_items_delete_own" on public.my_day_items;
create policy "my_day_items_delete_own" on public.my_day_items
  for delete
  using (owner_id = auth.uid());
