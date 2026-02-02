import { isSupabaseConfigured, supabase } from '../supabase.ts';
import { getPushBlockReason, type SyncStatus } from '../sync.ts';
import { getSyncState, markPulledOnce } from '../syncState.ts';
import { utcDateKey } from './time.ts';
import type { PinnedItem } from './dailyStorage.ts';

type MyDayItemRow = {
  id: string;
  owner_id: string;
  date_utc: string;
  chunk_id: string;
  item_type: string;
  payload: unknown;
  status: string;
  reason_code: string | null;
  reason_text: string | null;
  pinned_at_utc: string;
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

function rowToMyDayItem(row: MyDayItemRow): PinnedItem | null {
  if (!row || typeof row.id !== 'string') return null;
  if (!row.date_utc || !row.chunk_id) return null;
  if (!row.pinned_at_utc || !row.updated_at) return null;
  if (!isRecord(row.payload)) return null;

  const base = {
    pinned_id: row.id,
    date_utc: row.date_utc,
    chunk_id: row.chunk_id,
    status: row.status as PinnedItem['status'],
    reason_code: (row.reason_code ?? null) as PinnedItem['reason_code'],
    reason_text: row.reason_text ?? null,
    pinned_at_utc: row.pinned_at_utc,
    updated_at_utc: row.updated_at,
    deleted_at_utc: row.deleted_at,
  } as const;

  const payload = row.payload as Record<string, unknown>;

  if (row.item_type === 'todo_task') {
    const todoId = typeof payload.todo_id === 'string' ? payload.todo_id : null;
    const title = typeof payload.title_snapshot === 'string' ? payload.title_snapshot : null;
    const kind = payload.kind === 'admin' ? 'admin' : payload.kind === 'light' ? 'light' : null;
    if (!todoId || !title || !kind) return null;

    return {
      ...base,
      item_type: 'todo_task',
      todo_id: todoId,
      title_snapshot: title,
      kind,
    };
  }

  if (row.item_type !== 'pmo_action') return null;
  const projectId = typeof payload.project_id === 'string' ? payload.project_id : null;
  const projectSlug = typeof payload.project_slug === 'string' ? payload.project_slug : null;
  const projectTitle = typeof payload.project_title === 'string' ? payload.project_title : null;
  const actionId = typeof payload.action_id === 'string' ? payload.action_id : null;
  const actionText = typeof payload.action_text === 'string' ? payload.action_text : null;
  const kind =
    payload.kind === 'deep' ? 'deep' : payload.kind === 'light' ? 'light' : payload.kind === 'admin' ? 'admin' : null;
  if (!projectId || !projectSlug || !projectTitle || !actionId || !actionText || !kind) return null;

  return {
    ...base,
    item_type: 'pmo_action',
    project_id: projectId,
    project_slug: projectSlug,
    project_title: projectTitle,
    action_id: actionId,
    action_text: actionText,
    kind,
  };
}

function myDayItemToRow(item: PinnedItem, ownerId: string): Omit<MyDayItemRow, 'created_at'> {
  const payload =
    item.item_type === 'todo_task'
      ? { todo_id: item.todo_id, title_snapshot: item.title_snapshot, kind: item.kind }
      : {
          project_id: item.project_id,
          project_slug: item.project_slug,
          project_title: item.project_title,
          action_id: item.action_id,
          action_text: item.action_text,
          kind: item.kind,
        };

  return {
    id: item.pinned_id,
    owner_id: ownerId,
    date_utc: item.date_utc,
    chunk_id: item.chunk_id,
    item_type: item.item_type,
    payload,
    status: item.status,
    reason_code: item.reason_code,
    reason_text: item.reason_text,
    pinned_at_utc: item.pinned_at_utc,
    updated_at: item.updated_at_utc,
    deleted_at: item.deleted_at_utc ?? null,
  };
}

function getTimeMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function getPullWindow(params?: { daysBack?: number }): { startDateUtc: string; endDateUtc: string; daysBack: number } {
  const endDateUtc = utcDateKey();
  const requested = params?.daysBack ?? 30;
  const daysBack = Math.max(2, Math.floor(requested));
  const startDateUtc = utcDateKey(new Date(Date.now() - (daysBack - 1) * 24 * 60 * 60 * 1000));
  return { startDateUtc, endDateUtc, daysBack };
}

export async function pullMyDayFromCloud(params?: { daysBack?: number }): Promise<PinnedItem[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const ownerId = await getOwnerId();
  if (!ownerId) return null;

  const { startDateUtc, endDateUtc } = getPullWindow(params);

  try {
    const { data, error } = await supabase
      .from('my_day_items')
      .select('*')
      .gte('date_utc', startDateUtc)
      .lte('date_utc', endDateUtc);

    if (error) {
      console.error('Failed to pull My Day from cloud:', error);
      return null;
    }

    return (data as MyDayItemRow[]).map(rowToMyDayItem).filter((i): i is PinnedItem => Boolean(i));
  } catch (err) {
    console.error('Pull My Day from cloud failed:', err);
    return null;
  }
}

export async function pushMyDayToCloud(items: PinnedItem[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  if (items.length === 0) return true;

  const ownerId = await getOwnerId();
  if (!ownerId) return false;

  try {
    const rows = items.map((i) => myDayItemToRow(i, ownerId));
    const { error } = await supabase.from('my_day_items').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Failed to push My Day to cloud:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Push My Day to cloud failed:', err);
    return false;
  }
}

export function mergeMyDay(localItems: PinnedItem[], cloudItems: PinnedItem[]): PinnedItem[] {
  const merged = new Map<string, PinnedItem>();

  for (const item of cloudItems) merged.set(item.pinned_id, item);

  for (const local of localItems) {
    const cloud = merged.get(local.pinned_id);
    if (!cloud) {
      merged.set(local.pinned_id, local);
      continue;
    }

    const localTime = getTimeMs(local.updated_at_utc);
    const cloudTime = getTimeMs(cloud.updated_at_utc);
    if (localTime > cloudTime) merged.set(local.pinned_id, local);
  }

  return Array.from(merged.values());
}

export function computeMyDayUpserts(localItems: PinnedItem[], cloudItems: PinnedItem[]): PinnedItem[] {
  const cloudById = new Map<string, PinnedItem>(cloudItems.map((i) => [i.pinned_id, i]));
  const toUpsert: PinnedItem[] = [];

  for (const local of localItems) {
    const cloud = cloudById.get(local.pinned_id);
    if (!cloud) {
      toUpsert.push(local);
      continue;
    }

    const localTime = getTimeMs(local.updated_at_utc);
    const cloudTime = getTimeMs(cloud.updated_at_utc);
    if (localTime > cloudTime) toUpsert.push(local);
  }

  return toUpsert;
}

export async function syncMyDayItems(
  localItems: PinnedItem[],
  onStatusChange?: (status: SyncStatus) => void,
  options?: { allowBootstrapPush?: boolean; daysBack?: number }
): Promise<PinnedItem[]> {
  if (!isSupabaseConfigured) {
    onStatusChange?.('offline');
    return localItems;
  }
  if (!navigator.onLine) {
    onStatusChange?.('offline');
    return localItems;
  }

  const ownerId = await getOwnerId();
  if (!ownerId) {
    onStatusChange?.('idle');
    return localItems;
  }

  onStatusChange?.('syncing');

  try {
    const wasPulledOnce = getSyncState({ entity: 'my_day', scopeUserId: ownerId }).hasPulledOnce;
    const allowBootstrapPush = Boolean(options?.allowBootstrapPush);

    const cloudItems = await pullMyDayFromCloud({ daysBack: options?.daysBack });
    if (cloudItems === null) {
      onStatusChange?.('error');
      return localItems;
    }

    markPulledOnce(new Date().toISOString(), { entity: 'my_day', scopeUserId: ownerId });
    const merged = mergeMyDay(localItems, cloudItems);

    const reason = getPushBlockReason({
      wasPulledOnce,
      localCount: localItems.length,
      remoteCount: cloudItems.length,
      allowBootstrapPush,
    });
    if (reason !== null) {
      onStatusChange?.('synced');
      return merged;
    }

    const upsertsOnly = computeMyDayUpserts(localItems, cloudItems);
    const pushOk = await pushMyDayToCloud(upsertsOnly);
    if (!pushOk) {
      onStatusChange?.('error');
      return merged;
    }

    onStatusChange?.('synced');
    return merged;
  } catch (err) {
    console.error('My Day sync failed:', err);
    onStatusChange?.('error');
    return localItems;
  }
}

export function filterItemsToWindow(items: PinnedItem[], params?: { daysBack?: number }): PinnedItem[] {
  const { startDateUtc, endDateUtc } = getPullWindow(params);
  return items.filter((i) => i.date_utc >= startDateUtc && i.date_utc <= endDateUtc);
}

