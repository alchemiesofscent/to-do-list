import type { AcademicTask } from './types.ts';
import { getOrCreateUserId } from './userNamespace.ts';

type DbVersion = 1;

interface ScholarOpusDbV1 {
  version: DbVersion;
  tasksById: Record<string, AcademicTask>;
  sources?: {
    projectsMd?: {
      revision: string;
      importedAt: string;
    };
  };
}

const DB_KEY = 'scholar_opus_db';
const LEGACY_TASKS_KEY = 'scholar_opus_tasks';

export function getUserId(): string {
  return getOrCreateUserId();
}

export function setUserId(): void {
  // No-op: namespace is managed via localStorage and should not be regenerated.
}

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

function normalizeTasks(tasks: unknown): AcademicTask[] {
  if (!Array.isArray(tasks)) return [];
  return tasks.filter((t): t is AcademicTask => {
    if (!isRecord(t)) return false;
    return (
      typeof t.id === 'string' &&
      typeof t.title === 'string' &&
      typeof t.type === 'string' &&
      typeof t.priority === 'string' &&
      typeof t.status === 'string' &&
      typeof t.description === 'string'
    );
  });
}

function tasksArrayToMap(tasks: AcademicTask[]): Record<string, AcademicTask> {
  return Object.fromEntries(tasks.map((t) => [t.id, t]));
}

function tasksMapToArray(tasksById: Record<string, AcademicTask>): AcademicTask[] {
  return Object.values(tasksById);
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
    // Ignore persistence failures.
  }
}

function loadDb(storageKey: string): ScholarOpusDbV1 | null {
  const raw = safeParseJson(safeGetItem(storageKey));
  if (!isRecord(raw)) return null;
  if (raw.version !== 1) return null;
  if (!isRecord(raw.tasksById)) return null;
  return raw as unknown as ScholarOpusDbV1;
}

function saveDb(storageKey: string, db: ScholarOpusDbV1) {
  safeSetItem(storageKey, JSON.stringify(db));
}

function mergeSeedTasks(existingById: Record<string, AcademicTask>, seedTasks: AcademicTask[]) {
  for (const seedTask of seedTasks) {
    if (!existingById[seedTask.id]) {
      existingById[seedTask.id] = seedTask;
    }
  }
}

export function loadTasksFromDb(params: {
  seedTasks: AcademicTask[];
  seedRevision: string;
  storageKey?: string;
  fallbackStorageKey?: string;
}): AcademicTask[] {
  const { seedTasks, seedRevision } = params;
  const storageKey = params.storageKey ?? DB_KEY;
  const fallbackStorageKey = params.fallbackStorageKey;

  try {
    if (fallbackStorageKey && !safeGetItem(storageKey)) {
      const fallbackDb = loadDb(fallbackStorageKey);
      if (fallbackDb) saveDb(storageKey, fallbackDb);
    }

    const legacyTasks = normalizeTasks(safeParseJson(safeGetItem(LEGACY_TASKS_KEY)));
    if (legacyTasks.length > 0 && !safeGetItem(storageKey)) {
      const db: ScholarOpusDbV1 = {
        version: 1,
        tasksById: tasksArrayToMap(legacyTasks),
        sources: {
          projectsMd: { revision: seedRevision, importedAt: new Date().toISOString() },
        },
      };
      mergeSeedTasks(db.tasksById, seedTasks);
      saveDb(storageKey, db);
      return tasksMapToArray(db.tasksById);
    }

    const db = loadDb(storageKey);
    if (!db) {
      const newDb: ScholarOpusDbV1 = {
        version: 1,
        tasksById: tasksArrayToMap(seedTasks),
        sources: {
          projectsMd: { revision: seedRevision, importedAt: new Date().toISOString() },
        },
      };
      saveDb(storageKey, newDb);
      return seedTasks;
    }

    const existingTasks = tasksMapToArray(db.tasksById);
    if (existingTasks.length === 0) {
      db.tasksById = tasksArrayToMap(seedTasks);
      db.sources = {
        ...(db.sources ?? {}),
        projectsMd: { revision: seedRevision, importedAt: new Date().toISOString() },
      };
      saveDb(storageKey, db);
      return seedTasks;
    }

    const existingRevision = db.sources?.projectsMd?.revision;
    if (existingRevision !== seedRevision) {
      mergeSeedTasks(db.tasksById, seedTasks);
      db.sources = {
        ...(db.sources ?? {}),
        projectsMd: { revision: seedRevision, importedAt: new Date().toISOString() },
      };
      saveDb(storageKey, db);
    }

    return tasksMapToArray(db.tasksById);
  } catch {
    return seedTasks;
  }
}

export function saveTasksToDb(params: { tasks: AcademicTask[]; seedRevision: string; storageKey?: string }) {
  const { tasks, seedRevision } = params;
  const storageKey = params.storageKey ?? DB_KEY;
  try {
    const db: ScholarOpusDbV1 = loadDb(storageKey) ?? { version: 1, tasksById: {} };
    db.tasksById = tasksArrayToMap(tasks);
    db.sources = {
      ...(db.sources ?? {}),
      projectsMd: db.sources?.projectsMd ?? { revision: seedRevision, importedAt: new Date().toISOString() },
    };
    saveDb(storageKey, db);
  } catch {
    // Ignore persistence failures (e.g. storage disabled).
  }
}
