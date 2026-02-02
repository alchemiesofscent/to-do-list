# Decisions (ADR-lite) — PMO console

## ADR-0001 — Markdown as source of truth
- Date: 2026-01-23
- Status: accepted
- Context: PI wants agent-first, memoryless operation with durable project plans/status in versioned files.
- Decision: Project plan/status/actions are authored in repo markdown under `/projects/<project_slug>/`; the SPA is read-only for these files.
- Consequences: UI edits are out of scope; changes occur via agents (Codex/LLM) committing updates to markdown.
- Alternatives considered: Rich in-app editor; external PM tool (rejected: complexity and tool sprawl).

## ADR-0002 — Daily execution is localStorage-only
- Date: 2026-01-23
- Status: accepted
- Context: Daily execution changes frequently and should not require repo writes or sync.
- Decision: localStorage stores only daily pinned tasks + statuses + reasons + timestamps; exports provide memoryless handoff to agents.
- Consequences: Daily history is per-browser unless exported.

## ADR-0003 — Supabase Auth + RLS + tombstones for sync
- Date: 2026-02-02
- Status: accepted
- Context: Client-side `user_id` filtering with an anon key is not a security boundary and makes robust deletion/conflict handling harder.
- Decision:
  - Use Supabase Auth (PKCE) and RLS policies based on `owner_id = auth.uid()` for all synced tables.
  - Use tombstones (`deleted_at`) for deletes to prevent “resurrection” across offline-first devices.
  - Keep the app fully usable local-only by default; cloud sync is opt-in via `/auth` and requires env vars + sign-in.
  - Scope user data localStorage keys by auth user id (suffixing keys) to avoid mixing data between accounts.
- Consequences:
  - Existing legacy `tasks.user_id` rows must be manually “claimed” by setting `owner_id` via SQL once per account.
  - Hard delete/purge can be added later as an explicit action (not part of normal UX).

## ADR-0004 — My Day (PMO Daily) sync via `my_day_items`
- Date: 2026-02-02
- Status: accepted
- Context: PMO Daily should be available across devices when cloud sync is enabled, and deletes must not resurrect after offline edits.
- Decision:
  - Store PMO Daily items in `public.my_day_items` with RLS (`owner_id = auth.uid()`).
  - Use tombstones (`deleted_at`) for removes; local storage uses `deleted_at_utc` and merge is last-write-wins by `updated_at`.
  - Support two item types: `pmo_action` (project action pins) and `todo_task` (To Do pins with kind `light|admin`).
- Consequences:
  - “Remove from today” is a soft delete; purge is deferred.
  - Exports include pinned To Do items but project excerpts are generated only for touched PMO projects.
