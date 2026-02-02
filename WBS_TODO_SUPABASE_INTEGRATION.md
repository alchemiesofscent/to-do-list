# WBS: To Do + PMO (“My Day”) integration with Supabase

Date: 2026-01-31
Update: 2026-02-02 — Decision changed: use Supabase Auth (PKCE) + RLS (`owner_id = auth.uid()`) and tombstones (`deleted_at`) for robust delete.

## 0. Goals / non-goals

### Goals (now)
- Add a **To Do** area for small personal tasks, synced via the existing Supabase project used by Research Corpus (`src/sync.ts` → table `tasks`).
- Treat **PMO Daily** as the product’s “**My Day**” experience (i.e., PMO is the day plan / day log).
- Allow “light linking” between To Do and My Day:
  - You can pin a To Do item into today’s PMO plan (so PMO can show both project actions and small personal tasks).

### Explicit deferrals (later)
- Creating To Do tasks/subtasks directly from Research Corpus projects/tasks (architecture placeholder only; do not implement now).
- Fully redesigning PMO concepts (chunks, guardrails, export formats) beyond what’s needed to include To Do pins.
- Hard delete / purge UX (tombstones are the default delete strategy).

## 1. Current baseline (what exists today)

### Supabase integration
- Research Corpus sync uses `src/sync.ts` against Supabase table `tasks` (type `TaskRow` in `src/supabase.ts`).
- The sync model is last-write-wins by `updated_at` (`AcademicTask.updatedAt`).
- There are push guardrails: pull-once requirement, anti-clobber, empty-namespace bootstrap (`src/sync.ts`, `src/syncState.ts`).
- Identity for cloud access is Supabase Auth (`auth.uid()`); `tasks.user_id` is legacy-only (kept temporarily for manual claim/migration).

### PMO “My Day” storage
- PMO Daily pinned items are local-only in `localStorage` (`src/pmo/dailyStorage.ts`, key `scholar_opus_pmo_daily`).
- PMO currently has its own UI and does not sync to Supabase.

## 2. Key architecture decisions (make these first)

### 2.1 Security model for Supabase tables
Decision (accepted — 2026-02-02):
- Use Supabase Auth (PKCE) with RLS policies based on `owner_id = auth.uid()` for all synced tables.
- Do not rely on client-side `user_id` filtering as a security boundary.
- Keep legacy `tasks.user_id` temporarily only to support a manual one-time “claim” migration to `owner_id`.

### 2.2 Data modeling choice: unified “My Day items” table vs. PMO-only + ToDo-only tables
Recommendation (MVP):
- Add **two tables**:
  1) `todo_tasks` for the To Do tab
  2) `my_day_items` as the canonical store for “what’s on my day” (PMO daily plan), including:
     - PMO project actions
     - To Do tasks pinned into the day

Rationale:
- Keeps To Do tasks reusable outside a day plan.
- Treats PMO as the “My Day ledger” without forcing PMO’s entire domain model into To Do.

## 3. Proposed Supabase schema (MVP)

> Note: new tables use `owner_id uuid` (auth uid) + `deleted_at` tombstones for robust deletes.

### 3.1 `todo_tasks`
Purpose: store small personal tasks (title, completion, importance, due date, note, and simple step list).

Minimal columns:
- `id text primary key`
- `owner_id uuid not null`
- `title text not null`
- `completed boolean not null default false`
- `is_important boolean not null default false`
- `due_date date null`
- `note text not null default ''`
- `steps jsonb not null default '[]'::jsonb`  (array of `{id,title,completed}`)
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null`
- `deleted_at timestamptz null`

Indexes:
- `(owner_id)`
- `(owner_id, updated_at desc)`

Suggested SQL (for migration):
```sql
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
```

### 3.2 `my_day_items`
Purpose: represent PMO daily plan items for a given UTC day. This becomes the synced “My Day” store.

Minimal columns:
- `id text primary key`
- `owner_id uuid not null`
- `date_utc date not null` (the `utcDateKey()` day; store as date type)
- `chunk_id text not null`
- `item_type text not null` (enum-by-convention; MVP: `pmo_action` | `todo_task`)
- `payload jsonb not null` (type-specific snapshot / pointers)
- `status text not null` (MVP: reuse PMO statuses: `done|ready_to_send|blocked|not_done`)
- `reason_code text null`
- `reason_text text null`
- `pinned_at_utc timestamptz not null`
- `updated_at timestamptz not null`
- `deleted_at timestamptz null`

Indexes:
- `(owner_id, date_utc)`
- optional unique constraint to prevent duplicates:
  - for `pmo_action`: `(user_id, date_utc, item_type, (payload->>'action_id'))`
  - for `todo_task`: `(user_id, date_utc, item_type, (payload->>'todo_id'))`

Suggested SQL (for migration):
```sql
create table if not exists public.my_day_items (
  id text primary key,
  user_id text not null,
  date_utc date not null,
  chunk_id text not null,
  item_type text not null,
  payload jsonb not null,
  status text not null,
  reason_code text null,
  reason_text text null,
  pinned_at_utc timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists my_day_items_user_day_idx on public.my_day_items (user_id, date_utc);
```

Payload shapes (client-side TypeScript, MVP):
- `pmo_action` payload mirrors `src/pmo/dailyStorage.ts` fields:
  - `project_id, project_slug, project_title, action_id, action_text, kind`
- `todo_task` payload references To Do:
  - `todo_id` (string)
  - optionally `title_snapshot` (string) for resilience if the To Do title changes

## 4. App storage + sync design (MVP)

### 4.1 Local-first persistence
Keep offline UX consistent with existing app:
- Continue using localStorage as the “fast local DB”.
- Add:
  - `src/todo/storage.ts` (key `scholar_opus_todo_db`)
  - `src/pmo/dailyStorage.ts` to gain a Supabase-backed mode (see migration plan below)

### 4.2 Sync modules (mirror `src/sync.ts`)
Create two additional sync modules with the same guardrails and last-write-wins:
- `src/todo/syncTodo.ts`:
  - `pullTodoFromCloud()` (from `todo_tasks`)
  - `pushTodoToCloud(upsertsOnly)`
  - `mergeTodo(local, cloud)` (by `updated_at`)
  - `computeTodoUpserts(local, cloud)`
- `src/pmo/syncMyDay.ts`:
  - `pullMyDayFromCloud()` (from `my_day_items`, optionally day-range)
  - `pushMyDayToCloud(upsertsOnly)` (upsert by `id`)
  - `mergeMyDay(local, cloud)` (by `updated_at`)

Shared utilities (recommended):
- A small internal helper to reduce duplication across the 3 sync modules (Corpus, ToDo, MyDay), but keep it minimal to avoid risk.

Sync-state keys:
- Either reuse `src/syncState.ts` and extend it to track `hasPulledOnce` per-entity, or
- add dedicated keys:
  - `scholar_opus_sync_state_todo`
  - `scholar_opus_sync_state_my_day`

Recommendation:
- Per-entity state, to avoid a successful Corpus pull “unlocking push” for To Do / My Day before they’ve pulled.

### 4.3 Orchestration / UI status
- Add a “Sync All” orchestration step (likely in `src/TrackerApp.tsx` where sync currently runs):
  - On app load: pull+merge for each configured entity (Corpus, To Do, My Day)
  - On change: debounce and sync only that entity
- Present status as:
  - one aggregated status (worst-of), or
  - a small multi-entity indicator in the Settings modal (future).

## 5. Product behavior: “My Day == PMO”

### 5.1 Navigation mapping
- Global header tabs:
  - Research Corpus → Tracker (`src/TrackerApp.tsx`)
  - PMO → `/pmo/daily` (this is “My Day”)
  - To Do → `/todo`

### 5.2 To Do → My Day pinning (MVP)
In the To Do UI:
- Provide an affordance on a task row and/or task details panel:
  - “Pin to today” (select chunk if needed; default chunk)
- Implementation:
  - Create a `my_day_items` row with `item_type='todo_task'`, payload `{ todo_id, title_snapshot }`, `status='not_done'`
  - PMO daily page loads *both* `pmo_action` and `todo_task` items for today and renders them in the same chunk sections.

### 5.3 PMO → To Do (optional, MVP+)
Optional reciprocal behavior:
- Allow converting a PMO pinned To Do item back into a standalone To Do task if it doesn’t exist (mainly for import / recovery).

## 6. Migration plan (incremental, low risk)

### 6.1 Phase A: add To Do table + sync
Deliverables:
- Supabase migration adding `todo_tasks`
- App: To Do tab (local + cloud sync)
- No change to PMO yet (My Day pinning can still be local-only if needed)

Acceptance criteria:
- A To Do task created on device A appears on device B after sync (same `user_id` namespace).

### 6.2 Phase B: add My Day table + dual-write for PMO pins
Deliverables:
- Supabase migration adding `my_day_items`
- App: PMO daily loads from local + cloud merge (last-write-wins)
- On pin/update/remove, write locally and enqueue cloud upsert/delete (or represent delete as tombstone; see below)

Deletion strategy (choose one):
- Hard delete: on remove, call `.delete()` with `id` + `user_id` (simpler, but offline conflicts are harder).
- Tombstones: keep `deleted_at` and filter client-side (best for offline-first).

Recommendation:
- Tombstones for `my_day_items` (PMO is log-like and conflicts are likely).

### 6.3 Phase C: unify “today view” semantics
Deliverables:
- PMO daily becomes canonical “My Day”.
- To Do “My Day” nav item routes to PMO daily, and pinning To Do into PMO is the preferred workflow.

## 7. Testing / validation WBS (MVP)
- Unit tests:
  - Route parsing for `/todo`
  - `todo` local storage schema guards
  - `todo` merge/upsert logic (timestamp comparisons)
  - `my_day_items` merge semantics (including tombstones if used)
- Manual QA checklist:
  - Offline create/edit To Do → online sync merges correctly
  - Two-device concurrent edits resolve predictably
  - Pin To Do into PMO and verify it displays under correct day/chunk

## 8. WBS (work breakdown structure)

### 1. Project setup
1.1 Confirm current Supabase `tasks` table policy stance (RLS on/off, required headers)  
1.2 Choose deletion strategy for `my_day_items` (hard delete vs tombstone)  
1.3 Decide whether To Do “steps” live as JSONB (MVP) or normalized table (defer)  

### 2. Supabase schema
2.1 Add migration: `todo_tasks` table + indexes  
2.2 Add migration: `my_day_items` table + indexes  
2.3 (If needed) Add policies matching existing `tasks` access pattern  
2.4 Document schema + payload shapes (short internal note)  

### 3. Local persistence
3.1 Implement `src/todo/storage.ts` (local DB + schema validation)  
3.2 Extend/adjust `src/pmo/dailyStorage.ts` to support tombstones (if chosen)  
3.3 Add migration path from any legacy To Do keys (if any)  

### 4. Sync (client)
4.1 Implement `src/todo/syncTodo.ts` (pull/merge/upsert/delete)  
4.2 Implement `src/pmo/syncMyDay.ts` (pull/merge/upsert/delete/tombstone)  
4.3 Add per-entity sync state keys (avoid “pull once” leakage across entities)  
4.4 Add orchestration “sync all” entry point and status aggregation  

### 5. UI / product flows
5.1 Add `/todo` route and To Do tab shell  
5.2 Implement To Do list + details UI (MVP)  
5.3 Add “Pin to today (PMO)” from To Do  
5.4 Update PMO daily rendering to include `todo_task` items  
5.5 Redesign global header to include 3 tabs: Research Corpus | PMO | To Do  

### 6. Tests + QA
6.1 Add unit tests for storage + merge/upsert rules  
6.2 Add unit tests for route parsing and base path behavior  
6.3 Manual QA pass (offline/online, two-device, pin/unpin)  

### 7. Release / rollout
7.1 Deploy Supabase migrations  
7.2 Release web build  
7.3 Monitor logs for sync errors (client console + Supabase logs)  
7.4 If issues: disable To Do sync behind a feature flag (optional)  

## 9. Deferred architecture placeholder: linking Corpus → To Do / subtasks

When ready, introduce a generalized “work item link” concept rather than hard-wiring To Do to Corpus:
- Table: `work_item_links`
  - `id, user_id, from_type, from_id, to_type, to_id, created_at`
- This allows:
  - Corpus project/task → To Do task
  - To Do task → PMO day item
  - PMO action → Corpus task (traceability)

Defer until after To Do + My Day sync is stable.
