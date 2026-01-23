# Engineering log — PMO console

## Session start — 2026-01-23
- Engineer: Codex
- Goal for this session: Implement Phase 0→1 “Agent-first PMO console” (assets, loader, UI, daily tracking, exports, validation, docs).
- Context read:
  - `.github/workflows/pages.yml` (SPA fallback via `dist/404.html`)
  - `src/projectsParser.ts` (ProjectID comes from parsed top-level checklist items; `meta.id` overrides stable hash)
  - `vite.config.ts` (GitHub Pages base path configuration)
- Planned vertical slices:
  1) Add `/pmo/` + `/projects/<slug>/` templates and continuity docs
  2) Build-time asset packaging (`public/pmo`, `public/projects`, manifests)
  3) SPA loader + strict parsing (frontmatter, tables, config)
  4) PMO routes + Daily + Project pages
  5) LocalStorage daily tracking + export (Daily Report + Agent Pack)
  6) `pmo:validate` script + docs

## Progress
- [x] Add `/pmo/` and `/projects/` templates
- [x] Add asset packaging and manifests
- [x] Add SPA loader and parsing (frontmatter, tables, config)
- [x] Add PMO UI routes
- [x] Add daily localStorage + export + Agent Pack
- [x] Add `pmo:validate`
- [ ] Run full checks and commit slices

## Milestone — assets packaged
- Implemented `npm run build:pmo-assets` to copy `/pmo` and `/projects` into `public/pmo` and `public/projects` and generate deterministic `index.json` manifests.
- Verified locally: `npm run build:pmo-assets` created `public/pmo/index.json` and `public/projects/index.json`.

## Milestone — PMO UI + exports
- Added routes:
  - `/pmo/daily` (Daily page with 6 chunks, status capture, guardrails)
  - `/pmo/project/:projectSlug` (read-only project view + pin open actions)
- Added localStorage key `scholar_opus_pmo_daily` for daily execution only.
- Added exports: Daily Report (Markdown + JSON) and Agent Pack (includes touched projects’ 02_status.md and 03_actions.md excerpts).

## Milestone — validation
- Added `npm run pmo:validate` for schema and guardrail checks (including 03_actions status=open|done|dropped and max open actions).

## Acceptance checklist — 2026-01-23
- [x] Build ships `pmo/index.json` and `projects/index.json` under `import.meta.env.BASE_URL`
- [x] PMO Daily page renders 6 chunks from `pmo/config.yml`
- [x] Project page renders read-only markdown and allows pinning only actions with status=open
- [x] Guardrails enforced when pinning (max 8 tasks/day; max 2 deep-work projects/day)
- [x] Status capture requires reasons (min 10 chars) for blocked/not_done; export is locked otherwise
- [x] Export produces Daily Report (Markdown + JSON + prompt) and Agent Pack with embedded 02_status.md + 03_actions.md excerpts for touched projects
- [x] localStorage scope limited to daily execution tracking (`scholar_opus_pmo_daily`)
- [x] `npm run pmo:validate` checks schemas, slug/id consistency, open-action limit, and stale warnings
- [x] GitHub Pages refresh supported via `dist/404.html` SPA fallback (documented in `docs/pmo.md`)

## Session end — 2026-01-23
- Verification commands:
  - `npm run lint`
  - `npm test`
  - `npm run typecheck`
  - `npm run pmo:validate`
  - `npm run build`
- Next steps:
  - Add more project folders under `/projects/` as needed (one example is checked in).
  - Extend Daily page with a simple “history picker” for past UTC dates (read-only).
  - Consider adding `npm run pmo:validate` to CI once PMO content expands.

## Incident — GitHub Pages base path case mismatch (2026-01-23)
- Symptom: production site exists at `/to-do-list/`, but app was built for `/To-Do-List/`, causing 404s and JS blocked due to MIME `text/html`.
- Fix: set Vite production `base` to `/to-do-list/` and ensure runtime uses `import.meta.env.BASE_URL` (router/content loader already do).
- Verification:
  - `npm run build`
  - Confirmed `dist/index.html` references `/to-do-list/assets/...` and files exist under `dist/assets/`.

## Notes
- Timestamps are stored in UTC (ISO8601 `Z`); UI displays dates/times in Europe/Prague.
- PMO is read-only for project plans; only daily execution is stored locally.
