const RETURN_TO_KEY = 'scholar_opus_auth_return_to';

function safeGetSessionStorageItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetSessionStorageItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore (blocked storage, etc.)
  }
}

function safeRemoveSessionStorageItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export function setAuthReturnTo(path: string): void {
  const next = path.trim();
  if (!next.startsWith('/')) return;
  safeSetSessionStorageItem(RETURN_TO_KEY, next);
}

export function popAuthReturnTo(fallback: string = '/'): string {
  const value = safeGetSessionStorageItem(RETURN_TO_KEY);
  safeRemoveSessionStorageItem(RETURN_TO_KEY);
  if (value && value.startsWith('/')) return value;
  return fallback;
}

