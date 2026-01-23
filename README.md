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

## Optional Supabase sync: namespace recovery

If Supabase sync is enabled and you accidentally wrote into the wrong `user_id` namespace, use the in-app **Synchronisation settings** panel:

- Open **Synchronisation settings** (desktop: next to the sync indicator; mobile: Actions → Synchronisation settings).
- Paste the intended `user_id` and click **Verify namespace** to check the remote task count.
- Click **Switch** to set `localStorage.scholar_opus_user_id`, reset the sync state, and do a pull-first merge.

This flow never auto-pushes on load, and it will not delete anything in Supabase.

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

Note: the GitHub Pages build is configured for the `/to-do-list/` base path. If you fork or rename the repo, update the Vite `base` setting in `vite.config.ts`.
