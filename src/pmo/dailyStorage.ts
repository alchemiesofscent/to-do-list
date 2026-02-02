import { utcDateKey } from './time.ts';

export type DailyStatus = 'done' | 'ready_to_send' | 'blocked' | 'not_done';

export type ReasonCode =
  | 'waiting_on_colleague'
  | 'waiting_on_materials'
  | 'scope_unclear'
  | 'needs_admin_time'
  | 'needs_deep_think'
  | 'fatigue_context_switching'
  | 'overran_estimate'
  | 'blocked_by_dependency'
  | 'other';

export type MyDayItemType = 'pmo_action' | 'todo_task';

type MyDayItemBase = {
  pinned_id: string;
  item_type: MyDayItemType;
  date_utc: string; // YYYY-MM-DD (UTC key)
  chunk_id: string;

  status: DailyStatus;
  reason_code: ReasonCode | null;
  reason_text: string | null;

  pinned_at_utc: string; // ISO8601 Z
  updated_at_utc: string; // ISO8601 Z
  deleted_at_utc: string | null; // ISO8601 Z
};

export type PmoActionMyDayItem = MyDayItemBase & {
  item_type: 'pmo_action';

  project_id: string;
  project_slug: string;
  project_title: string;

  action_id: string;
  action_text: string;
  kind: 'deep' | 'light' | 'admin';
};

export type TodoTaskMyDayItem = MyDayItemBase & {
  item_type: 'todo_task';

  todo_id: string;
  title_snapshot: string;
  kind: 'light' | 'admin';
};

export type PinnedItem = PmoActionMyDayItem | TodoTaskMyDayItem;

type PmoDailyDbV1 = {
  version: 1;
  days: Record<string, { pinned: PinnedItem[] }>;
};

const KEY = 'scholar_opus_pmo_daily';

function keyForScope(scopeUserId: string | null | undefined): string {
  return scopeUserId ? `${KEY}:${scopeUserId}` : KEY;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

function safeParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeMyDayItem(raw: unknown): PinnedItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const rec = raw as Record<string, unknown>;

  const pinned_id = typeof rec.pinned_id === 'string' ? rec.pinned_id : null;
  const date_utc = typeof rec.date_utc === 'string' ? rec.date_utc : null;
  const chunk_id = typeof rec.chunk_id === 'string' ? rec.chunk_id : null;
  const status = typeof rec.status === 'string' ? rec.status : null;
  if (!pinned_id || !date_utc || !chunk_id) return null;
  if (status !== 'done' && status !== 'ready_to_send' && status !== 'blocked' && status !== 'not_done') return null;

  const reason_code = typeof rec.reason_code === 'string' ? (rec.reason_code as ReasonCode) : null;
  const reason_text = typeof rec.reason_text === 'string' ? rec.reason_text : null;
  const pinned_at_utc = typeof rec.pinned_at_utc === 'string' ? rec.pinned_at_utc : null;
  const updated_at_utc = typeof rec.updated_at_utc === 'string' ? rec.updated_at_utc : null;
  if (!pinned_at_utc || !updated_at_utc) return null;

  const deleted_at_utc = typeof rec.deleted_at_utc === 'string' ? rec.deleted_at_utc : null;
  const item_type = typeof rec.item_type === 'string' ? rec.item_type : 'pmo_action';

  if (item_type === 'todo_task') {
    const todo_id = typeof rec.todo_id === 'string' ? rec.todo_id : null;
    const title_snapshot = typeof rec.title_snapshot === 'string' ? rec.title_snapshot : null;
    const kind = rec.kind === 'admin' ? 'admin' : rec.kind === 'light' ? 'light' : null;
    if (!todo_id || !title_snapshot || !kind) return null;
    const item: TodoTaskMyDayItem = {
      pinned_id,
      item_type: 'todo_task',
      date_utc,
      chunk_id,
      todo_id,
      title_snapshot,
      kind,
      status,
      reason_code: reason_code ?? null,
      reason_text: reason_text ?? null,
      pinned_at_utc,
      updated_at_utc,
      deleted_at_utc,
    };
    return item;
  }

  const project_id = typeof rec.project_id === 'string' ? rec.project_id : null;
  const project_slug = typeof rec.project_slug === 'string' ? rec.project_slug : null;
  const project_title = typeof rec.project_title === 'string' ? rec.project_title : null;
  const action_id = typeof rec.action_id === 'string' ? rec.action_id : null;
  const action_text = typeof rec.action_text === 'string' ? rec.action_text : null;
  const kind =
    rec.kind === 'deep' ? 'deep' : rec.kind === 'light' ? 'light' : rec.kind === 'admin' ? 'admin' : null;
  if (!project_id || !project_slug || !project_title || !action_id || !action_text || !kind) return null;

  const item: PmoActionMyDayItem = {
    pinned_id,
    item_type: 'pmo_action',
    date_utc,
    chunk_id,
    project_id,
    project_slug,
    project_title,
    action_id,
    action_text,
    kind,
    status,
    reason_code: reason_code ?? null,
    reason_text: reason_text ?? null,
    pinned_at_utc,
    updated_at_utc,
    deleted_at_utc,
  };
  return item;
}

function loadDb(scopeUserId: string | null | undefined): PmoDailyDbV1 {
  const scopedKey = keyForScope(scopeUserId);
  if (scopeUserId && !safeGetItem(scopedKey)) {
    const fallback = safeGetItem(KEY);
    if (fallback) safeSetItem(scopedKey, fallback);
  }

  const raw = safeParse(safeGetItem(scopedKey));
  if (!isRecord(raw)) return { version: 1, days: {} };
  if (raw.version !== 1) return { version: 1, days: {} };
  if (!isRecord(raw.days)) return { version: 1, days: {} };
  return raw as unknown as PmoDailyDbV1;
}

function saveDb(scopeUserId: string | null | undefined, db: PmoDailyDbV1) {
  safeSetItem(keyForScope(scopeUserId), JSON.stringify(db));
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getAllItemsFromDb(db: PmoDailyDbV1): PinnedItem[] {
  const items: PinnedItem[] = [];
  for (const day of Object.values(db.days)) {
    for (const raw of day.pinned ?? []) {
      const item = normalizeMyDayItem(raw);
      if (item) items.push(item);
    }
  }
  return items;
}

function getDayItemsFromDb(db: PmoDailyDbV1, dateUtc: string): PinnedItem[] {
  const items = db.days[dateUtc]?.pinned ?? [];
  return items.map(normalizeMyDayItem).filter((i): i is PinnedItem => Boolean(i));
}

export function getDayPinnedItems(dateUtc: string = utcDateKey(), scopeUserId?: string | null): PinnedItem[] {
  const db = loadDb(scopeUserId);
  return getDayItemsFromDb(db, dateUtc).filter((i) => !i.deleted_at_utc);
}

export function getDayPinnedItemsForSync(dateUtc: string = utcDateKey(), scopeUserId?: string | null): PinnedItem[] {
  const db = loadDb(scopeUserId);
  return getDayItemsFromDb(db, dateUtc);
}

export function getAllPinnedItemsForSync(scopeUserId?: string | null): PinnedItem[] {
  const db = loadDb(scopeUserId);
  return getAllItemsFromDb(db);
}

export function upsertPinnedItem(item: PinnedItem, scopeUserId?: string | null): void {
  const db = loadDb(scopeUserId);
  const day = (db.days[item.date_utc] ??= { pinned: [] });
  const existingItems = day.pinned.map(normalizeMyDayItem).filter((i): i is PinnedItem => Boolean(i));
  const idx = existingItems.findIndex((p) => p.pinned_id === item.pinned_id);
  if (idx === -1) existingItems.push(item);
  else existingItems[idx] = item;
  day.pinned = existingItems;
  saveDb(scopeUserId, db);
}

export function upsertPinnedItems(items: PinnedItem[], scopeUserId?: string | null): void {
  if (items.length === 0) return;
  const db = loadDb(scopeUserId);
  for (const item of items) {
    const day = (db.days[item.date_utc] ??= { pinned: [] });
    const existingItems = day.pinned.map(normalizeMyDayItem).filter((i): i is PinnedItem => Boolean(i));
    const idx = existingItems.findIndex((p) => p.pinned_id === item.pinned_id);
    if (idx === -1) existingItems.push(item);
    else existingItems[idx] = item;
    day.pinned = existingItems;
  }
  saveDb(scopeUserId, db);
}

export function removePinnedItem(params: { dateUtc: string; pinnedId: string }, scopeUserId?: string | null): void {
  const db = loadDb(scopeUserId);
  const day = (db.days[params.dateUtc] ??= { pinned: [] });
  const existingItems = day.pinned.map(normalizeMyDayItem).filter((i): i is PinnedItem => Boolean(i));
  const idx = existingItems.findIndex((p) => p.pinned_id === params.pinnedId);
  if (idx === -1) return;
  const now = new Date().toISOString();
  existingItems[idx] = { ...existingItems[idx], deleted_at_utc: now, updated_at_utc: now };
  day.pinned = existingItems;
  saveDb(scopeUserId, db);
}

export function pinAction(params: {
  dateUtc?: string;
  chunkId: string;
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  actionId: string;
  actionText: string;
  kind: 'deep' | 'light' | 'admin';
}, scopeUserId?: string | null): PinnedItem {
  const date_utc = params.dateUtc ?? utcDateKey();
  const now = new Date().toISOString();

  const item: PmoActionMyDayItem = {
    pinned_id: newId(),
    item_type: 'pmo_action',
    date_utc,
    chunk_id: params.chunkId,
    project_id: params.projectId,
    project_slug: params.projectSlug,
    project_title: params.projectTitle,
    action_id: params.actionId,
    action_text: params.actionText,
    kind: params.kind,
    status: 'not_done',
    reason_code: null,
    reason_text: null,
    pinned_at_utc: now,
    updated_at_utc: now,
    deleted_at_utc: null,
  };

  const db = loadDb(scopeUserId);
  const day = (db.days[date_utc] ??= { pinned: [] });
  day.pinned.push(item);
  saveDb(scopeUserId, db);
  return item;
}

function todoPinId(todoId: string, dateUtc: string): string {
  return `todo:${todoId}:${dateUtc}`;
}

export function pinTodoTask(params: {
  dateUtc?: string;
  chunkId: string;
  todoId: string;
  titleSnapshot: string;
  kind: 'light' | 'admin';
}, scopeUserId?: string | null): PinnedItem {
  const date_utc = params.dateUtc ?? utcDateKey();
  const now = new Date().toISOString();
  const pinned_id = todoPinId(params.todoId, date_utc);

  const db = loadDb(scopeUserId);
  const day = (db.days[date_utc] ??= { pinned: [] });
  const existingItems = day.pinned.map(normalizeMyDayItem).filter((i): i is PinnedItem => Boolean(i));

  const idx = existingItems.findIndex((p) => p.pinned_id === pinned_id);
  const pinned_at_utc = idx === -1 ? now : existingItems[idx]!.pinned_at_utc;

  const item: TodoTaskMyDayItem = {
    pinned_id,
    item_type: 'todo_task',
    date_utc,
    chunk_id: params.chunkId,
    todo_id: params.todoId,
    title_snapshot: params.titleSnapshot,
    kind: params.kind,
    status: idx === -1 ? 'not_done' : existingItems[idx]!.status,
    reason_code: idx === -1 ? null : existingItems[idx]!.reason_code,
    reason_text: idx === -1 ? null : existingItems[idx]!.reason_text,
    pinned_at_utc,
    updated_at_utc: now,
    deleted_at_utc: null,
  };

  if (idx === -1) existingItems.push(item);
  else existingItems[idx] = item;
  day.pinned = existingItems;
  saveDb(scopeUserId, db);
  return item;
}
