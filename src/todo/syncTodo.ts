import { isSupabaseConfigured, supabase } from '../supabase.ts';
import { getPushBlockReason, type SyncStatus } from '../sync.ts';
import { getSyncState, markPulledOnce } from '../syncState.ts';
import type { TodoStep, TodoTask } from './types.ts';

type TodoTaskRow = {
  id: string;
  owner_id: string;
  title: string;
  completed: boolean;
  is_important: boolean;
  due_date: string | null;
  note: string;
  steps: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

async function getOwnerId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.user.id ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeSteps(value: unknown): TodoStep[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is TodoStep => {
    if (!isRecord(s)) return false;
    return typeof s.id === 'string' && typeof s.title === 'string' && typeof s.completed === 'boolean';
  });
}

function rowToTodoTask(row: TodoTaskRow): TodoTask {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    isImportant: row.is_important,
    dueDate: row.due_date,
    note: row.note ?? '',
    steps: normalizeSteps(row.steps),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function todoTaskToRow(task: TodoTask, ownerId: string): Omit<TodoTaskRow, 'created_at'> {
  return {
    id: task.id,
    owner_id: ownerId,
    title: task.title,
    completed: task.completed,
    is_important: task.isImportant,
    due_date: task.dueDate,
    note: task.note ?? '',
    steps: task.steps ?? [],
    updated_at: task.updatedAt,
    deleted_at: task.deletedAt ?? null,
  };
}

export async function pullTodoFromCloud(): Promise<TodoTask[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const ownerId = await getOwnerId();
  if (!ownerId) return null;

  try {
    const { data, error } = await supabase.from('todo_tasks').select('*');
    if (error) {
      console.error('Failed to pull To Do from cloud:', error);
      return null;
    }
    return (data as TodoTaskRow[]).map(rowToTodoTask);
  } catch (err) {
    console.error('Pull To Do from cloud failed:', err);
    return null;
  }
}

export async function pushTodoToCloud(tasks: TodoTask[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  if (tasks.length === 0) return true;

  const ownerId = await getOwnerId();
  if (!ownerId) return false;

  try {
    const rows = tasks.map((t) => todoTaskToRow(t, ownerId));
    const { error } = await supabase.from('todo_tasks').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Failed to push To Do to cloud:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Push To Do to cloud failed:', err);
    return false;
  }
}

function getTimeMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function mergeTodo(localTasks: TodoTask[], cloudTasks: TodoTask[]): TodoTask[] {
  const merged = new Map<string, TodoTask>();

  for (const task of cloudTasks) merged.set(task.id, task);

  for (const localTask of localTasks) {
    const cloudTask = merged.get(localTask.id);
    if (!cloudTask) {
      merged.set(localTask.id, localTask);
      continue;
    }

    const localTime = getTimeMs(localTask.updatedAt);
    const cloudTime = getTimeMs(cloudTask.updatedAt);
    if (localTime > cloudTime) merged.set(localTask.id, localTask);
  }

  return Array.from(merged.values());
}

export function computeTodoUpserts(localTasks: TodoTask[], cloudTasks: TodoTask[]): TodoTask[] {
  const cloudById = new Map<string, TodoTask>(cloudTasks.map((t) => [t.id, t]));
  const toUpsert: TodoTask[] = [];

  for (const localTask of localTasks) {
    if (!localTask.updatedAt) continue;

    const cloudTask = cloudById.get(localTask.id);
    if (!cloudTask) {
      toUpsert.push(localTask);
      continue;
    }

    const localTime = getTimeMs(localTask.updatedAt);
    const cloudTime = getTimeMs(cloudTask.updatedAt);
    if (localTime > cloudTime) toUpsert.push(localTask);
  }

  return toUpsert;
}

export async function syncTodoTasks(
  localTasks: TodoTask[],
  onStatusChange?: (status: SyncStatus) => void,
  options?: { allowBootstrapPush?: boolean }
): Promise<TodoTask[]> {
  if (!isSupabaseConfigured) {
    onStatusChange?.('offline');
    return localTasks;
  }
  if (!navigator.onLine) {
    onStatusChange?.('offline');
    return localTasks;
  }

  const ownerId = await getOwnerId();
  if (!ownerId) {
    onStatusChange?.('idle');
    return localTasks;
  }

  onStatusChange?.('syncing');

  try {
    const wasPulledOnce = getSyncState({ entity: 'todo', scopeUserId: ownerId }).hasPulledOnce;
    const allowBootstrapPush = Boolean(options?.allowBootstrapPush);

    const cloudTasks = await pullTodoFromCloud();
    if (cloudTasks === null) {
      onStatusChange?.('error');
      return localTasks;
    }

    markPulledOnce(new Date().toISOString(), { entity: 'todo', scopeUserId: ownerId });
    const mergedTasks = mergeTodo(localTasks, cloudTasks);

    const reason = getPushBlockReason({
      wasPulledOnce,
      localCount: localTasks.length,
      remoteCount: cloudTasks.length,
      allowBootstrapPush,
    });
    if (reason !== null) {
      onStatusChange?.('synced');
      return mergedTasks;
    }

    const upsertsOnly = computeTodoUpserts(localTasks, cloudTasks);
    const pushOk = await pushTodoToCloud(upsertsOnly);
    if (!pushOk) {
      onStatusChange?.('error');
      return mergedTasks;
    }

    onStatusChange?.('synced');
    return mergedTasks;
  } catch (err) {
    console.error('To Do sync failed:', err);
    onStatusChange?.('error');
    return localTasks;
  }
}

