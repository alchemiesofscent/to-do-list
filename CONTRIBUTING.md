# Contributing

## Prerequisites
- Node.js 20+

## Setup
1. Install dependencies: `npm ci`
2. Run locally: `npm run dev`

## Project structure
- `src/`: app code
- `public/`: static assets copied to `dist/`
- `projects.md`: source-of-truth seed list (imported at build time)

## Build
- Production build: `npm run build`
- Preview production build: `npm run preview`

## GitHub Pages
This repo deploys to `https://alchemiesofscent.github.io/To-Do-List/` via `.github/workflows/pages.yml`.

