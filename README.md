<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Scholar's Opus

Academic research and publication tracker (Vite + React).

AI Studio app: https://ai.studio/apps/drive/1HKCblpVkc_lUdD0WfRmNmF4iWv-JECQg

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm ci` (or `npm install`)
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Data

- Seed list: `projects.md` (parsed at build time)
- Persisted edits: browser `localStorage`

## Deploy to GitHub Pages

This repo is configured to deploy to `https://alchemiesofscent.github.io/To-Do-List/` via GitHub Actions.

1. In GitHub: **Settings → Pages → Source**: select **GitHub Actions**
2. Push to the `main` branch (or run the workflow manually via **Actions**)
