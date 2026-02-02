# QA checklist — Cloud sync (Supabase Auth + RLS + tombstones)

This checklist is for manual verification of the offline-first + optional cloud sync flows across:
- Research (Corpus) `public.tasks`
- To Do `public.todo_tasks`
- PMO / My Day `public.my_day_items`

## Pre-flight
- [ ] Build has Supabase env vars set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- [ ] You can sign in via `/auth` (GitHub OAuth enabled; redirect URL casing matches the deployed base path).
- [ ] Supabase tables have RLS enabled and policies `owner_id = auth.uid()` are present.
- [ ] (If migrating legacy data) Legacy `public.tasks.user_id` rows are claimed by setting `owner_id`.

## Local-only mode (no login)
- [ ] Create/edit/delete a Research task: persists after refresh.
- [ ] Create/edit/delete a To Do task: persists after refresh.
- [ ] Pin a PMO project action into today: persists after refresh.
- [ ] Pin a To Do task into today: persists after refresh.

## First-time cloud sync (bootstrap)
Goal: ensure no accidental “empty namespace” clobber.
- [ ] Sign in (`/auth`), then click manual sync on:
  - [ ] Research tab (Cloud indicator → manual sync)
  - [ ] To Do tab (Cloud indicator → manual sync)
  - [ ] PMO tab (Cloud indicator → manual sync)
- [ ] Verify cloud rows appear in Supabase tables for your `owner_id` (SQL editor counts).

## Offline → online sync (single device)
- [ ] While online and signed in, confirm status shows “Synced”.
- [ ] Go offline (DevTools → Network → Offline).
- [ ] Make edits:
  - [ ] Create a new To Do task
  - [ ] Delete (tombstone) an existing To Do task
  - [ ] Pin that To Do task into today’s PMO slot
  - [ ] Mark the pinned PMO item “done”
- [ ] Go online.
- [ ] Confirm status returns to “Synced” and changes are preserved after refresh.

## Two-device conflict (LWW)
Goal: verify last-write-wins behavior by `updated_at`.
1. Device A: open app, sign in, sync.
2. Device B: open app, sign in, sync.
- [ ] Both devices edit the same To Do task title with different values.
- [ ] Ensure the edit with the later `updated_at` wins after both have synced.

## Robust delete (tombstones)
Goal: ensure deletes do not “resurrect”.
- [ ] Device A: delete (tombstone) a To Do task while offline.
- [ ] Device B: edit the same task title while online.
- [ ] Bring Device A online, then sync both.
- [ ] Expected: whichever side has the later `updated_at` wins; if the delete is later, the task remains deleted (hidden).

## PMO / My Day specifics
- [ ] To Do pins render as a single collapsed row; clicking the row expands details.
- [ ] Only one To Do pin is expanded at a time.
- [ ] If a To Do pin is `blocked`/`not_done` without a reason, it auto-expands once and shows a “Needs reason” badge when collapsed.
- [ ] Slot (chunk) can be changed for both PMO actions and To Do pins; the item moves to the selected chunk.
- [ ] To Do pins count toward max-8 tasks/day.

## GitHub Pages routing
- [ ] Refresh on `/to-do-list/pmo/daily` works (SPA fallback).
- [ ] Refresh on `/to-do-list/todo` works.
- [ ] OAuth callback hits `/to-do-list/auth/callback` with the correct case.

