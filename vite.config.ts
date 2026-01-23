import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    // GitHub Pages serves this repo under `/<repo-name>/` (case-sensitive).
    // Default to this repo's current GitHub Pages path; overrideable for forks/renames.
    base: mode === 'production' ? (process.env.VITE_BASE_PATH ?? '/to-do-list/') : '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
