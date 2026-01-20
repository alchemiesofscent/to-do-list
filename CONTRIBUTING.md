# Contributing

## Prerequisites
- Node.js 20+

## Setup
1. Install dependencies: `npm ci`
2. Run locally: `npm run dev`

## Before you open a PR
- `npm run typecheck`
- `npm test`
- `npm run validate:data`
- `npm run build`

## Project structure
- `src/`: app code
- `public/`: static assets copied to `dist/`
- `data/projects.md`: source-of-truth seed list (imported at build time)
- `scripts/`: developer utilities
- `tests/`: unit tests

## Build
- Production build: `npm run build`
- Preview production build: `npm run preview`

## Branching & PR expectations
- Create a feature branch from `main`.
- Keep PRs focused and easy to review.
- Ensure CI is green before requesting review.

## Updating docs
- Keep `README.md` accurate whenever behavior, scripts, or data formats change.
- If you change the project seed format, update `scripts/validate-projects.ts` and related tests.

## Adding features safely
- Prefer small, incremental changes.
- If you add new data fields, consider localStorage migration impact (`src/db.ts`).
- Add/extend tests under `tests/` for non-trivial logic (parsing, migrations, classifiers).

## GitHub Pages
This repo deploys to `https://alchemiesofscent.github.io/To-Do-List/` via `.github/workflows/pages.yml`.
