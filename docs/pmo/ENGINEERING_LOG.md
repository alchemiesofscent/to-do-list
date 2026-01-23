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
- [ ] Add `/pmo/` and `/projects/` templates
- [ ] Add asset packaging and manifests
- [ ] Add SPA loader and rendering
- [ ] Add PMO UI routes
- [ ] Add daily localStorage + export + Agent Pack
- [ ] Add `pmo:validate`
- [ ] Run full checks and commit slices

## Notes
- Timestamps are stored in UTC (ISO8601 `Z`); UI displays dates/times in Europe/Prague.
- PMO is read-only for project plans; only daily execution is stored locally.

