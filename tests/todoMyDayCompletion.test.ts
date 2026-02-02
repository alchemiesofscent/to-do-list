import { describe, expect, it } from 'vitest';

import type { PinnedItem } from '../src/pmo/dailyStorage.ts';
import type { TodoTask } from '../src/todo/types.ts';
import { reconcileTodoMyDayCompletionToday } from '../src/integration/todoMyDayCompletion.ts';

function todoTask(id: string, updatedAt: string, patch?: Partial<TodoTask>): TodoTask {
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

function pinnedTodo(todoId: string, updatedAtUtc: string, patch?: Partial<PinnedItem>): Extract<PinnedItem, { item_type: 'todo_task' }> {
  const base: Extract<PinnedItem, { item_type: 'todo_task' }> = {
    pinned_id: `todo:${todoId}:2026-02-02`,
    item_type: 'todo_task',
    date_utc: '2026-02-02',
    chunk_id: 'chunk_1',
    todo_id: todoId,
    title_snapshot: 'Task',
    kind: 'light',
    status: 'not_done',
    reason_code: null,
    reason_text: null,
    pinned_at_utc: '2026-02-02T00:00:00.000Z',
    updated_at_utc: updatedAtUtc,
    deleted_at_utc: null,
  };
  return { ...base, ...(patch as Partial<typeof base> ?? {}) };
}

describe('todo <-> my day completion reconciliation (today)', () => {
  it('when My Day is newer, it drives To Do completed', () => {
    const task = todoTask('t1', '2026-02-02T10:00:00.000Z', { completed: false });
    const pinned = pinnedTodo('t1', '2026-02-02T12:00:00.000Z', { status: 'done' });

    const result = reconcileTodoMyDayCompletionToday({ todoTasks: [task], pinnedToday: [pinned] });
    expect(result.changedTodoIds).toEqual(['t1']);
    expect(result.nextTodoTasks[0]!.completed).toBe(true);
    expect(result.nextTodoTasks[0]!.updatedAt).toBe('2026-02-02T12:00:00.000Z');
  });

  it('when To Do is newer, it drives My Day status (preserving non-done states)', () => {
    const task = todoTask('t1', '2026-02-02T12:00:00.000Z', { completed: true });
    const pinned = pinnedTodo('t1', '2026-02-02T10:00:00.000Z', { status: 'blocked', reason_code: 'other', reason_text: 'Some reason text' });

    const result = reconcileTodoMyDayCompletionToday({ todoTasks: [task], pinnedToday: [pinned] });
    expect(result.changedPinnedIds).toEqual([pinned.pinned_id]);
    const nextPinned = result.nextPinnedToday[0] as Extract<PinnedItem, { item_type: 'todo_task' }>;
    expect(nextPinned.status).toBe('done');
    expect(nextPinned.updated_at_utc).toBe('2026-02-02T12:00:00.000Z');
    expect(nextPinned.reason_code).toBe(null);
    expect(nextPinned.reason_text).toBe(null);
  });

  it('reopening a To Do task only changes My Day if it was done', () => {
    const reopened = todoTask('t1', '2026-02-02T12:00:00.000Z', { completed: false });
    const pinnedBlocked = pinnedTodo('t1', '2026-02-02T10:00:00.000Z', { status: 'blocked' });
    const pinnedDone = pinnedTodo('t1', '2026-02-02T10:00:00.000Z', { status: 'done' });

    const r1 = reconcileTodoMyDayCompletionToday({ todoTasks: [reopened], pinnedToday: [pinnedBlocked] });
    expect(r1.changedPinnedIds).toEqual([]);

    const r2 = reconcileTodoMyDayCompletionToday({ todoTasks: [reopened], pinnedToday: [pinnedDone] });
    expect(r2.changedPinnedIds).toEqual([pinnedDone.pinned_id]);
    expect((r2.nextPinnedToday[0] as Extract<PinnedItem, { item_type: 'todo_task' }>).status).toBe('not_done');
  });

  it('ties resolve to My Day to correct drift', () => {
    const task = todoTask('t1', '2026-02-02T12:00:00.000Z', { completed: false });
    const pinned = pinnedTodo('t1', '2026-02-02T12:00:00.000Z', { status: 'done' });

    const result = reconcileTodoMyDayCompletionToday({ todoTasks: [task], pinnedToday: [pinned] });
    expect(result.changedTodoIds).toEqual(['t1']);
    expect(result.nextTodoTasks[0]!.completed).toBe(true);
  });
});

