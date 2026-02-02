# Scholar's Opus

Lightweight, local-first academic research and publication tracker (Vite + React). It seeds from a Markdown project list and stores edits locally in the browser (no backend).

## Quickstart

**Requirements:** Node.js 20+

```bash
npm ci && npm run dev
```

## Scripts

- `npm run dev`: run the dev server
- `npm run build`: build a production bundle into `dist/`
- `npm run preview`: preview the production build locally
- `npm run lint`: lint the codebase
- `npm run typecheck`: TypeScript typecheck
- `npm test`: run unit tests
- `npm run validate:data`: validate `data/projects.md` parses cleanly

## Configuration

No required environment variables.

## Architecture

- `src/main.tsx`: app entrypoint
- `src/App.tsx`: UI + filtering (Writing/Experiments/DH/Grants/Admin tabs)
- `src/projectsParser.ts`: parses `data/projects.md` into tasks at build time
- `src/db.ts`: localStorage persistence + migrations
- `src/components/*`: UI components
- `src/sync.ts`: optional Supabase sync (guarded, record-level)

## Optional Supabase cloud sync (Auth)

Cloud sync is optional. If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present, the app can sync via Supabase **Auth + RLS**.

- Enable: open **Cloud** (or go to `/auth`) and sign in (PKCE; callback at `${BASE_URL}auth/callback`).
- Security model: tables are protected by RLS (`owner_id = auth.uid()`); the client does not rely on `user_id` filtering for access control.
- Deletes: use tombstones (`deleted_at`) to prevent cross-device resurrection; hard delete/purge is deferred.
- Dashboard settings: add exact redirect URLs for dev + GitHub Pages base path (see `.github/workflows/pages.yml` for the deployed base path, and `vite.config.ts` for `base`).

Legacy migration note: if you have old rows in `public.tasks` that only have a legacy `user_id` namespace, you must manually “claim” them by setting `owner_id` via SQL (see `supabase/migrations/*_auth_owner_rls_tombstones.sql`).

## Data

- Seed list: `data/projects.md` (each entry is a checklist item with an indented metadata block)
- Saved state: browser `localStorage` (`scholar_opus_db`)

The Markdown seed is treated as read-only at runtime; changes made in the UI are not written back to `data/projects.md`.

Example entry:

```md
- [ ] Project title
  - domain: Writing
  - type: Article
  - status: Draft
  - priority: Medium
  - description: Short notes…
```

## Deployment (GitHub Pages)

This repo deploys to `https://alchemiesofscent.github.io/to-do-list/` via `.github/workflows/pages.yml`.

Note: the GitHub Pages build is configured for the `/to-do-list/` base path. If you fork or rename the repo, set `VITE_BASE_PATH` for production builds or update the Vite `base` setting in `vite.config.ts`.
