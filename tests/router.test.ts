import { describe, expect, it } from 'vitest';

import { parseRoute } from '../src/pmo/router.ts';

describe('router parsing', () => {
  it('parses known routes', () => {
    expect(parseRoute('/todo').kind).toBe('todo');
    expect(parseRoute('/auth').kind).toBe('auth');
    expect(parseRoute('/auth/callback').kind).toBe('auth-callback');
    expect(parseRoute('/pmo/daily').kind).toBe('pmo-daily');

    const proj = parseRoute('/pmo/project/My%20Project');
    expect(proj.kind).toBe('pmo-project');
    if (proj.kind === 'pmo-project') expect(proj.projectSlug).toBe('My Project');
  });

  it('falls back to tracker for unknown paths', () => {
    expect(parseRoute('/does-not-exist').kind).toBe('tracker');
  });
});

