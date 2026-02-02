type SyncStateV1 = {
  version: 1;
  hasPulledOnce: boolean;
  lastPulledAt?: string;
};

const SYNC_STATE_KEY = 'scholar_opus_sync_state';

export type SyncStateScope = {
  entity?: 'tasks' | 'todo' | 'my_day';
  scopeUserId?: string | null;
  storageKey?: string;
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

function resolveKey(scope?: SyncStateScope): string {
  if (!scope) return SYNC_STATE_KEY;
  if (scope.storageKey) return scope.storageKey;
  const entity = scope.entity ?? 'tasks';
  const userPart = scope.scopeUserId ? `:${scope.scopeUserId}` : '';
  return `${SYNC_STATE_KEY}:${entity}${userPart}`;
}

export function getSyncState(scope?: SyncStateScope): SyncStateV1 {
  const raw = safeParseJson(safeGetItem(resolveKey(scope)));
  if (!isRecord(raw)) return { version: 1, hasPulledOnce: false };
  if (raw.version !== 1) return { version: 1, hasPulledOnce: false };
  if (typeof raw.hasPulledOnce !== 'boolean') return { version: 1, hasPulledOnce: false };
  return raw as SyncStateV1;
}

export function markPulledOnce(pulledAtIso: string = new Date().toISOString(), scope?: SyncStateScope): void {
  const next: SyncStateV1 = { version: 1, hasPulledOnce: true, lastPulledAt: pulledAtIso };
  safeSetItem(resolveKey(scope), JSON.stringify(next));
}

export function resetSyncState(scope?: SyncStateScope): void {
  const next: SyncStateV1 = { version: 1, hasPulledOnce: false };
  safeSetItem(resolveKey(scope), JSON.stringify(next));
}

export function resetSyncStateForTestsOnly(): void {
  resetSyncState();
}
