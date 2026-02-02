import { describe, expect, it } from 'vitest';

import { installMockLocalStorage } from './testUtils.ts';
import { applyTodoCompletionFromMyDayStatusChange } from '../src/pmo/todoBridge.ts';
import { loadTodoTasks, TODO_DB_KEY } from '../src/todo/storage.ts';

function makeDb(tasksById: Record<string, unknown>) {
  return JSON.stringify({ version: 1, tasksById });
}

describe('PMO -> To Do completion bridge', () => {
  it('marks the underlying To Do task completed when My Day status becomes done', () => {
    installMockLocalStorage({
      [TODO_DB_KEY]: makeDb({
        t1: {
          id: 't1',
          title: 'Task',
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

    const didUpdate = applyTodoCompletionFromMyDayStatusChange({
      scopeUserId: null,
      todoId: 't1',
      prevStatus: 'not_done',
      nextStatus: 'done',
      nowIso: '2026-02-02T12:00:00.000Z',
    });
    expect(didUpdate).toBe(true);

    const [task] = loadTodoTasks({ storageKey: TODO_DB_KEY });
    expect(task.completed).toBe(true);
    expect(task.updatedAt).toBe('2026-02-02T12:00:00.000Z');
  });

  it('reopens the underlying To Do task when My Day status moves away from done', () => {
    installMockLocalStorage({
      [TODO_DB_KEY]: makeDb({
        t1: {
          id: 't1',
          title: 'Task',
          completed: true,
          isImportant: false,
          dueDate: null,
          note: '',
          steps: [],
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-02T00:00:00.000Z',
          deletedAt: null,
        },
      }),
    });

    const didUpdate = applyTodoCompletionFromMyDayStatusChange({
      scopeUserId: null,
      todoId: 't1',
      prevStatus: 'done',
      nextStatus: 'blocked',
      nowIso: '2026-02-02T12:00:00.000Z',
    });
    expect(didUpdate).toBe(true);

    const [task] = loadTodoTasks({ storageKey: TODO_DB_KEY });
    expect(task.completed).toBe(false);
  });

  it('does nothing when My Day status changes but completion does not', () => {
    const store = installMockLocalStorage({
      [TODO_DB_KEY]: makeDb({
        t1: {
          id: 't1',
          title: 'Task',
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

    const didUpdate = applyTodoCompletionFromMyDayStatusChange({
      scopeUserId: null,
      todoId: 't1',
      prevStatus: 'blocked',
      nextStatus: 'not_done',
      nowIso: '2026-02-02T12:00:00.000Z',
    });
    expect(didUpdate).toBe(false);
    expect(store.get(TODO_DB_KEY)).toBeTruthy();

    const [task] = loadTodoTasks({ storageKey: TODO_DB_KEY });
    expect(task.completed).toBe(false);
    expect(task.updatedAt).toBe('2026-02-01T00:00:00.000Z');
  });
});

