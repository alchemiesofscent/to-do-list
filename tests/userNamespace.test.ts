import { beforeEach, describe, expect, it } from 'vitest';

import { getOrCreateUserId } from '../src/userNamespace.ts';
import { installMockLocalStorage } from './testUtils.ts';

describe('user namespace', () => {
  beforeEach(() => {
    installMockLocalStorage();
  });

  it('persists a stable user_id and never regenerates', () => {
    const first = getOrCreateUserId();
    const second = getOrCreateUserId();
    expect(second).toBe(first);

    expect(localStorage.getItem('scholar_opus_user_id')).toBe(first);
  });

  it('does not depend on base path / URL', () => {
    Object.defineProperty(globalThis, 'location', {
      value: { href: 'https://example.test/To-Do-List/' },
      configurable: true,
    });
    const a = getOrCreateUserId();

    Object.defineProperty(globalThis, 'location', {
      value: { href: 'https://example.test/to-do-list/' },
      configurable: true,
    });
    const b = getOrCreateUserId();

    expect(b).toBe(a);
  });
});

