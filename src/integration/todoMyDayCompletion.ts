import type { DailyStatus, PinnedItem } from '../pmo/dailyStorage.ts';
import type { TodoTask } from '../todo/types.ts';

function getTimeMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function todoCompletedFromDailyStatus(status: DailyStatus): boolean {
  return status === 'done';
}

export function dailyStatusFromTodoCompleted(prevStatus: DailyStatus, completed: boolean): DailyStatus {
  if (completed) return 'done';
  if (prevStatus === 'done') return 'not_done';
  return prevStatus;
}

export type TodoMyDayReconcileResult = {
  nextTodoTasks: TodoTask[];
  nextPinnedToday: PinnedItem[];
  changedTodoIds: string[];
  changedPinnedIds: string[];
};

export function reconcileTodoMyDayCompletionToday(params: {
  todoTasks: TodoTask[];
  pinnedToday: PinnedItem[];
}): TodoMyDayReconcileResult {
  const todoTasks = params.todoTasks.slice();
  const pinnedToday = params.pinnedToday.slice();

  const todoIndexById = new Map<string, number>();
  for (let i = 0; i < todoTasks.length; i++) {
    todoIndexById.set(todoTasks[i]!.id, i);
  }

  const pinnedIndexByTodoId = new Map<string, number>();
  for (let i = 0; i < pinnedToday.length; i++) {
    const item = pinnedToday[i]!;
    if (item.item_type !== 'todo_task') continue;
    pinnedIndexByTodoId.set(item.todo_id, i);
  }

  const changedTodoIds: string[] = [];
  const changedPinnedIds: string[] = [];

  for (const [todoId, pinnedIdx] of pinnedIndexByTodoId.entries()) {
    const todoIdx = todoIndexById.get(todoId);
    if (todoIdx === undefined) continue;

    const task = todoTasks[todoIdx]!;
    if (task.deletedAt) continue;

    const pinned = pinnedToday[pinnedIdx]!;
    if (pinned.item_type !== 'todo_task') continue;
    if (pinned.deleted_at_utc) continue;

    const todoTime = getTimeMs(task.updatedAt);
    const myDayTime = getTimeMs(pinned.updated_at_utc);

    if (myDayTime > todoTime || (myDayTime === todoTime && todoCompletedFromDailyStatus(pinned.status) !== task.completed)) {
      const desiredCompleted = todoCompletedFromDailyStatus(pinned.status);
      if (task.completed !== desiredCompleted) {
        todoTasks[todoIdx] = { ...task, completed: desiredCompleted, updatedAt: pinned.updated_at_utc };
        changedTodoIds.push(task.id);
      }
      continue;
    }

    if (todoTime > myDayTime) {
      const nextStatus = dailyStatusFromTodoCompleted(pinned.status, task.completed);
      if (nextStatus !== pinned.status) {
        const clearReason = nextStatus === 'done' || nextStatus === 'ready_to_send';
        pinnedToday[pinnedIdx] = {
          ...pinned,
          status: nextStatus,
          updated_at_utc: task.updatedAt,
          reason_code: clearReason ? null : pinned.reason_code,
          reason_text: clearReason ? null : pinned.reason_text,
        };
        changedPinnedIds.push(pinned.pinned_id);
      }
    }
  }

  return { nextTodoTasks: todoTasks, nextPinnedToday: pinnedToday, changedTodoIds, changedPinnedIds };
}

