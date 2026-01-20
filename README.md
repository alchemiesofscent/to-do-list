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

This repo deploys to `https://alchemiesofscent.github.io/To-Do-List/` via `.github/workflows/pages.yml`.

Note: the GitHub Pages build is configured for the `/To-Do-List/` base path. If you fork or rename the repo, update the Vite `base` setting in `vite.config.ts`.
