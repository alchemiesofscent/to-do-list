import { supabase, isSupabaseConfigured, type TaskRow } from './supabase';
import { getUserId } from './db';
import type { AcademicTask } from './types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

// Convert AcademicTask to database row format
function taskToRow(task: AcademicTask, userId: string): Omit<TaskRow, 'created_at'> {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    domain: task.domain ?? null,
    type: task.type,
    priority: task.priority,
    status: task.status,
    description: task.description,
    co_authors: task.coAuthors ?? null,
    deadline: task.deadline ?? null,
    deadline_note: task.deadlineNote ?? null,
    is_favorite: task.isFavorite ?? false,
    section: task.section ?? null,
    subsection: task.subsection ?? null,
    source: task.source ?? null,
    updated_at: task.updatedAt ?? new Date().toISOString(),
  };
}

// Convert database row to AcademicTask
function rowToTask(row: TaskRow): AcademicTask {
  return {
    id: row.id,
    title: row.title,
    domain: row.domain as AcademicTask['domain'],
    type: row.type as AcademicTask['type'],
    priority: row.priority as AcademicTask['priority'],
    status: row.status as AcademicTask['status'],
    description: row.description,
    coAuthors: row.co_authors ?? undefined,
    deadline: row.deadline ?? undefined,
    deadlineNote: row.deadline_note ?? undefined,
    isFavorite: row.is_favorite,
    section: row.section ?? undefined,
    subsection: row.subsection ?? undefined,
    source: row.source ?? undefined,
    updatedAt: row.updated_at,
  };
}

// Fetch all tasks for the current user from Supabase
export async function pullFromCloud(): Promise<AcademicTask[] | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const userId = getUserId();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to pull from cloud:', error);
      return null;
    }

    return (data as TaskRow[]).map(rowToTask);
  } catch (err) {
    console.error('Pull from cloud failed:', err);
    return null;
  }
}

// Push all tasks to Supabase (upsert)
export async function pushToCloud(tasks: AcademicTask[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const userId = getUserId();
    const rows = tasks.map((task) => taskToRow(task, userId));

    // Upsert all tasks
    const { error } = await supabase
      .from('tasks')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('Failed to push to cloud:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Push to cloud failed:', err);
    return false;
  }
}

// Delete a task from the cloud
export async function deleteFromCloud(taskId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const userId = getUserId();
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete from cloud:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Delete from cloud failed:', err);
    return false;
  }
}

// Merge cloud and local tasks using last-write-wins
export function mergeTasks(
  localTasks: AcademicTask[],
  cloudTasks: AcademicTask[]
): AcademicTask[] {
  const merged = new Map<string, AcademicTask>();

  // Add all local tasks
  for (const task of localTasks) {
    merged.set(task.id, task);
  }

  // Merge cloud tasks (last-write-wins based on updatedAt)
  for (const cloudTask of cloudTasks) {
    const localTask = merged.get(cloudTask.id);

    if (!localTask) {
      // Task only exists in cloud
      merged.set(cloudTask.id, cloudTask);
    } else {
      // Both exist - compare timestamps
      const localTime = new Date(localTask.updatedAt ?? 0).getTime();
      const cloudTime = new Date(cloudTask.updatedAt ?? 0).getTime();

      if (cloudTime > localTime) {
        merged.set(cloudTask.id, cloudTask);
      }
      // If local is newer or equal, keep local (already in map)
    }
  }

  return Array.from(merged.values());
}

// Full sync: pull, merge, push
export async function syncTasks(
  localTasks: AcademicTask[],
  onStatusChange?: (status: SyncStatus) => void
): Promise<AcademicTask[]> {
  if (!isSupabaseConfigured) {
    onStatusChange?.('offline');
    return localTasks;
  }

  if (!navigator.onLine) {
    onStatusChange?.('offline');
    return localTasks;
  }

  onStatusChange?.('syncing');

  try {
    // Pull from cloud
    const cloudTasks = await pullFromCloud();

    if (cloudTasks === null) {
      onStatusChange?.('error');
      return localTasks;
    }

    // Merge local and cloud
    const mergedTasks = mergeTasks(localTasks, cloudTasks);

    // Push merged result back to cloud
    const pushSuccess = await pushToCloud(mergedTasks);

    if (!pushSuccess) {
      onStatusChange?.('error');
      return mergedTasks; // Still return merged even if push failed
    }

    onStatusChange?.('synced');
    return mergedTasks;
  } catch (err) {
    console.error('Sync failed:', err);
    onStatusChange?.('error');
    return localTasks;
  }
}
