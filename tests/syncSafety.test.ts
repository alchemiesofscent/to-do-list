import { beforeEach, describe, expect, it } from 'vitest';

import type { AcademicTask } from '../src/types.ts';
import { computeUpserts, mergeTasks, shouldBlockPush } from '../src/sync.ts';
import { installMockLocalStorage } from './testUtils.ts';
import { resetSyncStateForTestsOnly } from '../src/syncState.ts';

function task(params: Partial<AcademicTask> & Pick<AcademicTask, 'id' | 'title'>): AcademicTask {
  return {
    id: params.id,
    title: params.title,
    type: params.type ?? 'Article',
    priority: params.priority ?? 'Medium',
    status: params.status ?? 'Draft',
    description: params.description ?? '',
    domain: params.domain,
    updatedAt: params.updatedAt,
    isFavorite: params.isFavorite,
    deadline: params.deadline,
    deadlineNote: params.deadlineNote,
    coAuthors: params.coAuthors,
    section: params.section,
    subsection: params.subsection,
    source: params.source,
  };
}

describe('sync safety', () => {
  beforeEach(() => {
    installMockLocalStorage();
    resetSyncStateForTestsOnly();
  });

  it('blocks push when local is suspiciously smaller than remote', () => {
    const blocked = shouldBlockPush({
      wasPulledOnce: true,
      localCount: 1,
      remoteCount: 10,
      allowBootstrapPush: true,
    });
    expect(blocked).toBe(true);
  });

  it('blocks push on fresh client until hasPulledOnce', () => {
    const blocked = shouldBlockPush({
      wasPulledOnce: false,
      localCount: 10,
      remoteCount: 10,
      allowBootstrapPush: true,
    });
    expect(blocked).toBe(true);
  });

  it('blocks automatic push into an empty remote namespace unless explicitly allowed', () => {
    const blocked = shouldBlockPush({
      wasPulledOnce: true,
      localCount: 10,
      remoteCount: 0,
      allowBootstrapPush: false,
    });
    expect(blocked).toBe(true);
  });

  it('last-write-wins picks newer updatedAt for conflicts', () => {
    const olderLocal = task({ id: 'x', title: 'X local', updatedAt: '2024-01-01T00:00:00.000Z' });
    const newerCloud = task({ id: 'x', title: 'X cloud', updatedAt: '2024-02-01T00:00:00.000Z' });
    const merged1 = mergeTasks([olderLocal], [newerCloud]);
    expect(merged1.find((t) => t.id === 'x')!.title).toBe('X cloud');

    const newerLocal = task({ id: 'x', title: 'X local newer', updatedAt: '2024-03-01T00:00:00.000Z' });
    const merged2 = mergeTasks([newerLocal], [newerCloud]);
    expect(merged2.find((t) => t.id === 'x')!.title).toBe('X local newer');
  });

  it('does not treat missing local tasks as deletions (no implicit deletes)', () => {
    const cloudOnly = task({ id: 'c1', title: 'Cloud', updatedAt: '2024-01-01T00:00:00.000Z' });

    const merged = mergeTasks([], [cloudOnly]);
    expect(merged.map((t) => t.id)).toEqual(['c1']);

    const upserts = computeUpserts([], [cloudOnly]);
    expect(upserts).toEqual([]);
  });

  it('only upserts tasks that are new or newer locally (and have updatedAt)', () => {
    const cloudA = task({ id: 'a', title: 'A cloud', updatedAt: '2024-02-01T00:00:00.000Z' });
    const localAOlder = task({ id: 'a', title: 'A local older', updatedAt: '2024-01-01T00:00:00.000Z' });
    const localBNew = task({ id: 'b', title: 'B local new', updatedAt: '2024-03-01T00:00:00.000Z' });
    const seedNoUpdatedAt = task({ id: 'seed', title: 'seed task' });

    const upserts = computeUpserts([localAOlder, localBNew, seedNoUpdatedAt], [cloudA]);
    expect(upserts.map((t) => t.id).sort()).toEqual(['b']);
  });
});

