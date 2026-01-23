import { describe, expect, it } from 'vitest';

import viteConfig from '../vite.config.ts';

describe('GitHub Pages base path', () => {
  it('uses /to-do-list/ in production mode', async () => {
    const config =
      typeof viteConfig === 'function' ? await (viteConfig as any)({ mode: 'production', command: 'build' }) : viteConfig;
    expect(config.base).toBe('/to-do-list/');
  });
});
