import type { DailyStatus } from './dailyStorage.ts';
import { setTodoTaskCompleted } from '../todo/storage.ts';

function isCompletedFromMyDayStatus(status: DailyStatus): boolean {
  return status === 'done';
}

export function applyTodoCompletionFromMyDayStatusChange(params: {
  scopeUserId: string | null;
  todoId: string;
  prevStatus: DailyStatus;
  nextStatus: DailyStatus;
  nowIso?: string;
}): boolean {
  const prevCompleted = isCompletedFromMyDayStatus(params.prevStatus);
  const nextCompleted = isCompletedFromMyDayStatus(params.nextStatus);
  if (prevCompleted === nextCompleted) return false;

  return setTodoTaskCompleted({
    scopeUserId: params.scopeUserId,
    todoId: params.todoId,
    completed: nextCompleted,
    nowIso: params.nowIso,
  });
}

