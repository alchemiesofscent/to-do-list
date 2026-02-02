import { supabase, isSupabaseConfigured, type TaskRow } from './supabase';
import { getUserId } from './db';
import type { AcademicTask } from './types';
import { getSyncState, markPulledOnce } from './syncState.ts';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
export type PushBlockReason = 'fresh-client' | 'anti-clobber' | 'empty-namespace' | null;

async function getOwnerId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.user.id ?? null;
}

// Convert AcademicTask to database row format
function taskToRow(task: AcademicTask, params: { ownerId: string; legacyUserId: string }): Omit<TaskRow, 'created_at'> {
  return {
    id: task.id,
    owner_id: params.ownerId,
    user_id: params.legacyUserId,
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
    deleted_at: task.deletedAt ?? null,
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
    deletedAt: row.deleted_at ?? null,
  };
}

// Fetch all tasks for the current user from Supabase
export async function pullFromCloud(): Promise<AcademicTask[] | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const ownerId = await getOwnerId();
    if (!ownerId) return null;
    const { data, error } = await supabase
      .from('tasks')
      .select('*');

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
    if (tasks.length === 0) return true;
    const ownerId = await getOwnerId();
    if (!ownerId) return false;
    const legacyUserId = getUserId();
    const rows = tasks.map((task) => taskToRow(task, { ownerId, legacyUserId }));

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
    const ownerId = await getOwnerId();
    if (!ownerId) return false;
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('owner_id', ownerId);

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

  // Add all cloud tasks first (they are the source of truth)
  for (const task of cloudTasks) {
    merged.set(task.id, task);
  }

  // Merge local tasks - only override if local is definitively newer
  for (const localTask of localTasks) {
    const cloudTask = merged.get(localTask.id);

    if (!cloudTask) {
      // Task only exists locally - add it
      merged.set(localTask.id, localTask);
    } else {
      // Both exist - compare timestamps
      // Cloud wins unless local has a newer updatedAt
      const localTime = localTask.updatedAt ? new Date(localTask.updatedAt).getTime() : 0;
      const cloudTime = cloudTask.updatedAt ? new Date(cloudTask.updatedAt).getTime() : 0;

      if (localTime > cloudTime) {
        merged.set(localTask.id, localTask);
      }
      // Otherwise keep cloud version (already in map)
    }
  }

  return Array.from(merged.values());
}

function getTimeMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

// Record-level upserts: only push tasks that are new or definitively newer locally.
// Seed-only tasks (no updatedAt) are intentionally not pushed.
export function computeUpserts(localTasks: AcademicTask[], cloudTasks: AcademicTask[]): AcademicTask[] {
  const cloudById = new Map<string, AcademicTask>(cloudTasks.map((t) => [t.id, t]));
  const toUpsert: AcademicTask[] = [];

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

export function shouldBlockPush(params: {
  wasPulledOnce: boolean;
  localCount: number;
  remoteCount: number;
  allowBootstrapPush: boolean;
}): boolean {
  return getPushBlockReason(params) !== null;
}

export function getPushBlockReason(params: {
  wasPulledOnce: boolean;
  localCount: number;
  remoteCount: number;
  allowBootstrapPush: boolean;
}): PushBlockReason {
  const { wasPulledOnce, localCount, remoteCount, allowBootstrapPush } = params;

  // Fresh client rule: pull-only until we've successfully pulled at least once.
  if (!wasPulledOnce) return 'fresh-client';

  // Prevent accidental creation of a new empty namespace unless explicitly intended.
  if (remoteCount === 0 && !allowBootstrapPush) return 'empty-namespace';

  // Anti-clobber guardrail: suspiciously small local dataset should never push.
  if (remoteCount > 0 && localCount < 0.8 * remoteCount) return 'anti-clobber';

  return null;
}

function isDevBuild(): boolean {
  const meta = import.meta as unknown as { env?: { DEV?: boolean } };
  return Boolean(meta.env?.DEV);
}

function warnBlockedPushDevOnly(reason: PushBlockReason, details: { localCount: number; remoteCount: number }) {
  if (!isDevBuild() || reason === null) return;
  const { localCount, remoteCount } = details;
  if (reason === 'fresh-client') {
    console.warn(`[Scholar's Opus] Push blocked: fresh client pull-only (local=${localCount}, remote=${remoteCount})`);
    return;
  }
  if (reason === 'anti-clobber') {
    console.warn(`[Scholar's Opus] Push blocked: anti-clobber guard (local=${localCount}, remote=${remoteCount})`);
    return;
  }
  if (reason === 'empty-namespace') {
    console.warn(`[Scholar's Opus] Push blocked: empty namespace bootstrap requires manual sync (local=${localCount}, remote=${remoteCount})`);
  }
}

function logSyncSummaryDevOnly(summary: {
  userId: string;
  localCount: number;
  remoteCount: number;
  upsertsCount: number;
  pushAllowed: boolean;
  reason: PushBlockReason;
}) {
  if (!isDevBuild()) return;
  console.info(
    `[Scholar's Opus] Sync: user_id=${summary.userId} local=${summary.localCount} remote=${summary.remoteCount} upserts=${summary.upsertsCount} push=${summary.pushAllowed ? 'yes' : 'no'}${summary.reason ? ` reason=${summary.reason}` : ''}`
  );
}

// Full sync: pull, merge, push
export async function syncTasks(
  localTasks: AcademicTask[],
  onStatusChange?: (status: SyncStatus) => void,
  options?: { allowBootstrapPush?: boolean }
): Promise<AcademicTask[]> {
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
    const wasPulledOnce = getSyncState({ entity: 'tasks', scopeUserId: ownerId }).hasPulledOnce;
    const allowBootstrapPush = Boolean(options?.allowBootstrapPush);

    // Pull from cloud
    const cloudTasks = await pullFromCloud();

    if (cloudTasks === null) {
      onStatusChange?.('error');
      return localTasks;
    }

    // Mark successful pull (even if empty) so future syncs can push when allowed.
    markPulledOnce(new Date().toISOString(), { entity: 'tasks', scopeUserId: ownerId });

    // Merge local and cloud
    const mergedTasks = mergeTasks(localTasks, cloudTasks);

    const reason = getPushBlockReason({
      wasPulledOnce,
      localCount: localTasks.length,
      remoteCount: cloudTasks.length,
      allowBootstrapPush,
    });
    const blockPush = reason !== null;

    if (blockPush) {
      warnBlockedPushDevOnly(reason, { localCount: localTasks.length, remoteCount: cloudTasks.length });
      logSyncSummaryDevOnly({
        userId: ownerId,
        localCount: localTasks.length,
        remoteCount: cloudTasks.length,
        upsertsCount: 0,
        pushAllowed: false,
        reason,
      });
      onStatusChange?.('synced');
      return mergedTasks;
    }

    // Record-level push: only upsert tasks that are new or newer locally.
    const upsertsOnly = computeUpserts(localTasks, cloudTasks);
    const pushSuccess = await pushToCloud(upsertsOnly);

    if (!pushSuccess) {
      onStatusChange?.('error');
      return mergedTasks; // Still return merged even if push failed
    }

    logSyncSummaryDevOnly({
      userId: ownerId,
      localCount: localTasks.length,
      remoteCount: cloudTasks.length,
      upsertsCount: upsertsOnly.length,
      pushAllowed: true,
      reason: null,
    });

    onStatusChange?.('synced');
    return mergedTasks;
  } catch (err) {
    console.error('Sync failed:', err);
    onStatusChange?.('error');
    return localTasks;
  }
}
