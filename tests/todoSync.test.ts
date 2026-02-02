import { describe, expect, it } from 'vitest';

import type { TodoTask } from '../src/todo/types.ts';
import { computeTodoUpserts, mergeTodo } from '../src/todo/syncTodo.ts';

function task(id: string, updatedAt: string, patch?: Partial<TodoTask>): TodoTask {
  const base: TodoTask = {
    id,
    title: id,
    completed: false,
    isImportant: false,
    dueDate: null,
    note: '',
    steps: [],
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt,
    deletedAt: null,
  };
  return { ...base, ...(patch ?? {}) };
}

describe('todo sync merge/upserts', () => {
  it('mergeTodo is last-write-wins by updatedAt', () => {
    const cloud = task('x', '2026-02-02T00:00:00.000Z', { title: 'cloud' });
    const localOlder = task('x', '2026-02-01T00:00:00.000Z', { title: 'local' });
    const merged1 = mergeTodo([localOlder], [cloud]);
    expect(merged1.find((t) => t.id === 'x')!.title).toBe('cloud');

    const localNewer = task('x', '2026-02-03T00:00:00.000Z', { title: 'local-newer' });
    const merged2 = mergeTodo([localNewer], [cloud]);
    expect(merged2.find((t) => t.id === 'x')!.title).toBe('local-newer');
  });

  it('computeTodoUpserts includes new or newer local tasks (including tombstones)', () => {
    const cloudA = task('a', '2026-02-02T00:00:00.000Z');
    const localAOlder = task('a', '2026-02-01T00:00:00.000Z');
    const localBNew = task('b', '2026-02-03T00:00:00.000Z');
    const localDeleted = task('c', '2026-02-04T00:00:00.000Z', { deletedAt: '2026-02-04T00:00:00.000Z' });

    const upserts = computeTodoUpserts([localAOlder, localBNew, localDeleted], [cloudA]);
    expect(upserts.map((t) => t.id).sort()).toEqual(['b', 'c']);
  });
});

