<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Scholar's Opus

Academic research and publication tracker (Vite + React). It seeds from a Markdown project list and stores edits in the browser.

## Quickstart

**Requirements:** Node.js 20+

```bash
npm ci && npm run dev
```

## Scripts

- `npm run dev`: run the dev server
- `npm run build`: build a production bundle into `dist/`
- `npm run preview`: preview the production build locally
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
