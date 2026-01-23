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

## Notes
- Timestamps are stored in UTC (ISO8601 `Z`); UI displays dates/times in Europe/Prague.
- PMO is read-only for project plans; only daily execution is stored locally.
