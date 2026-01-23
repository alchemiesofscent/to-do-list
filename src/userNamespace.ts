const USER_ID_KEY = 'scholar_opus_user_id';

// This app intentionally uses a single shared namespace for all devices.
// Persisting it in localStorage prevents accidental namespace changes across builds/deployments.
const DEFAULT_USER_ID = 'scholar-opus-default-user';

function safeGetLocalStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore (storage disabled, etc.)
  }
}

let didLog = false;

export function getOrCreateUserId(): string {
  const existing = safeGetLocalStorageItem(USER_ID_KEY);
  if (existing && existing.trim()) return existing;

  // Never generate a random namespace: that risks creating new user_id partitions.
  safeSetLocalStorageItem(USER_ID_KEY, DEFAULT_USER_ID);

  return DEFAULT_USER_ID;
}

export function setUserIdExplicit(nextUserId: string): void {
  const trimmed = nextUserId.trim();
  if (!trimmed) return;
  safeSetLocalStorageItem(USER_ID_KEY, trimmed);
}

export function getUserIdFromStorage(): string | null {
  const existing = safeGetLocalStorageItem(USER_ID_KEY);
  return existing && existing.trim() ? existing : null;
}

export function logActiveUserIdDevOnly(): void {
  // Avoid depending on URL/base path; log only in dev builds.
  const meta = import.meta as unknown as { env?: { DEV?: boolean } };
  const isDev = Boolean(meta.env?.DEV);
  if (!isDev || didLog) return;
  didLog = true;
  console.info(`[Scholar's Opus] Supabase namespace user_id=${getOrCreateUserId()}`);
}
