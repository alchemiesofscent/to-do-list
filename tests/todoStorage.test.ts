import { describe, expect, it } from 'vitest';

import { installMockLocalStorage } from './testUtils.ts';
import { loadTodoTasks } from '../src/todo/storage.ts';

function makeDb(tasksById: Record<string, unknown>) {
  return JSON.stringify({ version: 1, tasksById });
}

describe('todo storage', () => {
  it('copies fallback db into scoped key when missing', () => {
    const fallbackKey = 'scholar_opus_todo_db';
    const scopedKey = 'scholar_opus_todo_db:uid';

    const store = installMockLocalStorage({
      [fallbackKey]: makeDb({
        a: {
          id: 'a',
          title: 'A',
          completed: false,
          isImportant: false,
          dueDate: null,
          note: '',
          steps: [],
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
          deletedAt: null,
        },
      }),
    });

    const tasks = loadTodoTasks({ storageKey: scopedKey, fallbackStorageKey: fallbackKey });
    expect(tasks.map((t) => t.id)).toEqual(['a']);

    expect(store.get(scopedKey)).toBeTruthy();
  });

  it('filters invalid tasks on load', () => {
    const key = 'scholar_opus_todo_db';
    installMockLocalStorage({
      [key]: makeDb({
        ok: {
          id: 'ok',
          title: 'OK',
          completed: false,
          isImportant: true,
          dueDate: '2026-02-02',
          note: '',
          steps: [{ id: 's1', title: 'Step', completed: false }],
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
          deletedAt: null,
        },
        bad: {
          id: 'bad',
          title: 123,
        },
      }),
    });

    const tasks = loadTodoTasks({ storageKey: key });
    expect(tasks.map((t) => t.id)).toEqual(['ok']);
  });
});

