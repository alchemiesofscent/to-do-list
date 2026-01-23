const DISPLAY_TZ = 'Europe/Prague';

export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function formatDateForDisplay(utcDateKeyValue: string): string {
  // Interpret the UTC date key as a UTC midnight instant for stable labelling.
  const dt = new Date(`${utcDateKeyValue}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DISPLAY_TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).format(dt);
}

export function formatUtcIsoForDisplay(isoUtc: string): string {
  const dt = new Date(isoUtc);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DISPLAY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dt);
}

