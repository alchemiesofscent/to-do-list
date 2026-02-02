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

export type PinnedItem = {
  pinned_id: string;
  date_utc: string; // YYYY-MM-DD (UTC key)
  chunk_id: string;

  project_id: string;
  project_slug: string;
  project_title: string;

  action_id: string;
  action_text: string;
  kind: 'deep' | 'light' | 'admin';

  status: DailyStatus;
  reason_code: ReasonCode | null;
  reason_text: string | null;

  pinned_at_utc: string; // ISO8601 Z
  updated_at_utc: string; // ISO8601 Z
};

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

function loadDb(scopeUserId: string | null | undefined): PmoDailyDbV1 {
  const raw = safeParse(safeGetItem(keyForScope(scopeUserId)));
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

export function getDayPinnedItems(dateUtc: string = utcDateKey(), scopeUserId?: string | null): PinnedItem[] {
  const db = loadDb(scopeUserId);
  return db.days[dateUtc]?.pinned ?? [];
}

export function upsertPinnedItem(item: PinnedItem, scopeUserId?: string | null): void {
  const db = loadDb(scopeUserId);
  const day = (db.days[item.date_utc] ??= { pinned: [] });
  const idx = day.pinned.findIndex((p) => p.pinned_id === item.pinned_id);
  if (idx === -1) day.pinned.push(item);
  else day.pinned[idx] = item;
  saveDb(scopeUserId, db);
}

export function removePinnedItem(params: { dateUtc: string; pinnedId: string }, scopeUserId?: string | null): void {
  const db = loadDb(scopeUserId);
  const day = db.days[params.dateUtc];
  if (!day) return;
  day.pinned = day.pinned.filter((p) => p.pinned_id !== params.pinnedId);
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

  const item: PinnedItem = {
    pinned_id: newId(),
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
  };

  const db = loadDb(scopeUserId);
  const day = (db.days[date_utc] ??= { pinned: [] });
  day.pinned.push(item);
  saveDb(scopeUserId, db);
  return item;
}
