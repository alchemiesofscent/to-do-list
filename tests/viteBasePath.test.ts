import { describe, expect, it } from 'vitest';
import type { ConfigEnv, UserConfig, UserConfigExport } from 'vite';

import viteConfig from '../vite.config.ts';

describe('GitHub Pages base path', () => {
  it('uses /To-Do-List/ in production mode', async () => {
    const exported = viteConfig as unknown as UserConfigExport;
    const env: ConfigEnv = { mode: 'production', command: 'build' };

    const config: UserConfig =
      typeof exported === 'function' ? await exported(env) : await Promise.resolve(exported);

    expect(config.base).toBe('/To-Do-List/');
  });
});
