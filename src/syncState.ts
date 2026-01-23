type SyncStateV1 = {
  version: 1;
  hasPulledOnce: boolean;
  lastPulledAt?: string;
};

const SYNC_STATE_KEY = 'scholar_opus_sync_state';

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

export function getSyncState(): SyncStateV1 {
  const raw = safeParseJson(safeGetItem(SYNC_STATE_KEY));
  if (!isRecord(raw)) return { version: 1, hasPulledOnce: false };
  if (raw.version !== 1) return { version: 1, hasPulledOnce: false };
  if (typeof raw.hasPulledOnce !== 'boolean') return { version: 1, hasPulledOnce: false };
  return raw as SyncStateV1;
}

export function markPulledOnce(pulledAtIso: string = new Date().toISOString()): void {
  const next: SyncStateV1 = { version: 1, hasPulledOnce: true, lastPulledAt: pulledAtIso };
  safeSetItem(SYNC_STATE_KEY, JSON.stringify(next));
}

export function resetSyncStateForTestsOnly(): void {
  safeSetItem(SYNC_STATE_KEY, JSON.stringify({ version: 1, hasPulledOnce: false } satisfies SyncStateV1));
}
