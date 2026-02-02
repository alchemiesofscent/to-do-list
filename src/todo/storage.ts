import type { TodoStep, TodoTask } from './types.ts';

export const TODO_DB_KEY = 'scholar_opus_todo_db';

export function todoStorageKeys(scopeUserId: string | null): { storageKey: string; fallbackStorageKey?: string } {
  return {
    storageKey: scopeUserId ? `${TODO_DB_KEY}:${scopeUserId}` : TODO_DB_KEY,
    fallbackStorageKey: scopeUserId ? TODO_DB_KEY : undefined,
  };
}

type TodoDbV1 = {
  version: 1;
  tasksById: Record<string, TodoTask>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function safeParseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures.
  }
}

function isTodoStep(value: unknown): value is TodoStep {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && typeof value.title === 'string' && typeof value.completed === 'boolean';
}

function normalizeSteps(value: unknown): TodoStep[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isTodoStep);
}

function normalizeTask(value: unknown): TodoTask | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string') return null;
  if (typeof value.title !== 'string') return null;
  if (typeof value.completed !== 'boolean') return null;
  if (typeof value.isImportant !== 'boolean') return null;
  const dueDate = value.dueDate;
  if (!(dueDate === null || typeof dueDate === 'string' || typeof dueDate === 'undefined')) return null;
  if (typeof value.note !== 'string') return null;
  if (typeof value.createdAt !== 'string') return null;
  if (typeof value.updatedAt !== 'string') return null;

  const deletedAt = value.deletedAt;
  if (!(deletedAt === null || typeof deletedAt === 'string' || typeof deletedAt === 'undefined')) return null;

  return {
    id: value.id,
    title: value.title,
    completed: value.completed,
    isImportant: value.isImportant,
    dueDate: (typeof dueDate === 'string' ? dueDate : null),
    note: value.note,
    steps: normalizeSteps(value.steps),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    deletedAt: (typeof deletedAt === 'string' ? deletedAt : null),
  };
}

function loadDb(storageKey: string): TodoDbV1 | null {
  const raw = safeParseJson(safeGetItem(storageKey));
  if (!isRecord(raw)) return null;
  if (raw.version !== 1) return null;
  if (!isRecord(raw.tasksById)) return null;
  return raw as unknown as TodoDbV1;
}

function saveDb(storageKey: string, db: TodoDbV1): void {
  safeSetItem(storageKey, JSON.stringify(db));
}

function tasksArrayToMap(tasks: TodoTask[]): Record<string, TodoTask> {
  return Object.fromEntries(tasks.map((t) => [t.id, t]));
}

function tasksMapToArray(tasksById: Record<string, TodoTask>): TodoTask[] {
  return Object.values(tasksById)
    .map((t) => normalizeTask(t))
    .filter((t): t is TodoTask => Boolean(t));
}

export function loadTodoTasks(params: { storageKey: string; fallbackStorageKey?: string }): TodoTask[] {
  const { storageKey, fallbackStorageKey } = params;

  try {
    if (fallbackStorageKey && !safeGetItem(storageKey)) {
      const fallbackDb = loadDb(fallbackStorageKey);
      if (fallbackDb) saveDb(storageKey, fallbackDb);
    }

    const db = loadDb(storageKey);
    if (!db) {
      const next: TodoDbV1 = { version: 1, tasksById: {} };
      saveDb(storageKey, next);
      return [];
    }

    return tasksMapToArray(db.tasksById);
  } catch {
    return [];
  }
}

export function saveTodoTasks(params: { storageKey: string; tasks: TodoTask[] }): void {
  const { storageKey, tasks } = params;
  try {
    const db: TodoDbV1 = loadDb(storageKey) ?? { version: 1, tasksById: {} };
    db.tasksById = tasksArrayToMap(tasks);
    saveDb(storageKey, db);
  } catch {
    // Ignore persistence failures.
  }
}

export function setTodoTaskCompleted(params: {
  scopeUserId: string | null;
  todoId: string;
  completed: boolean;
  nowIso?: string;
}): boolean {
  const { scopeUserId, todoId, completed } = params;
  const now = params.nowIso ?? new Date().toISOString();
  const { storageKey, fallbackStorageKey } = todoStorageKeys(scopeUserId);

  const tasks = loadTodoTasks({ storageKey, fallbackStorageKey });
  const idx = tasks.findIndex((t) => t.id === todoId && !t.deletedAt);
  if (idx === -1) return false;

  const existing = tasks[idx]!;
  if (existing.completed === completed) return false;

  const nextTasks = tasks.slice();
  nextTasks[idx] = { ...existing, completed, updatedAt: now };
  saveTodoTasks({ storageKey, tasks: nextTasks });
  return true;
}
