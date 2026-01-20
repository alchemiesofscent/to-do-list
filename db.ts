import type { AcademicTask } from './types.ts';

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

function loadDb(): ScholarOpusDbV1 | null {
  const raw = safeParseJson(localStorage.getItem(DB_KEY));
  if (!isRecord(raw)) return null;
  if (raw.version !== 1) return null;
  if (!isRecord(raw.tasksById)) return null;
  return raw as ScholarOpusDbV1;
}

function saveDb(db: ScholarOpusDbV1) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
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
}): AcademicTask[] {
  const { seedTasks, seedRevision } = params;

  try {
    const legacyTasks = normalizeTasks(safeParseJson(localStorage.getItem(LEGACY_TASKS_KEY)));
    if (legacyTasks.length > 0 && !localStorage.getItem(DB_KEY)) {
      const db: ScholarOpusDbV1 = {
        version: 1,
        tasksById: tasksArrayToMap(legacyTasks),
        sources: {
          projectsMd: { revision: seedRevision, importedAt: new Date().toISOString() },
        },
      };
      mergeSeedTasks(db.tasksById, seedTasks);
      saveDb(db);
      return tasksMapToArray(db.tasksById);
    }

    const db = loadDb();
    if (!db) {
      const newDb: ScholarOpusDbV1 = {
        version: 1,
        tasksById: tasksArrayToMap(seedTasks),
        sources: {
          projectsMd: { revision: seedRevision, importedAt: new Date().toISOString() },
        },
      };
      saveDb(newDb);
      return seedTasks;
    }

    const existingTasks = tasksMapToArray(db.tasksById);
    if (existingTasks.length === 0) {
      db.tasksById = tasksArrayToMap(seedTasks);
      db.sources = {
        ...(db.sources ?? {}),
        projectsMd: { revision: seedRevision, importedAt: new Date().toISOString() },
      };
      saveDb(db);
      return seedTasks;
    }

    const existingRevision = db.sources?.projectsMd?.revision;
    if (existingRevision !== seedRevision) {
      mergeSeedTasks(db.tasksById, seedTasks);
      db.sources = {
        ...(db.sources ?? {}),
        projectsMd: { revision: seedRevision, importedAt: new Date().toISOString() },
      };
      saveDb(db);
    }

    return tasksMapToArray(db.tasksById);
  } catch {
    return seedTasks;
  }
}

export function saveTasksToDb(params: { tasks: AcademicTask[]; seedRevision: string }) {
  const { tasks, seedRevision } = params;
  try {
    const db: ScholarOpusDbV1 = loadDb() ?? { version: 1, tasksById: {} };
    db.tasksById = tasksArrayToMap(tasks);
    db.sources = {
      ...(db.sources ?? {}),
      projectsMd: db.sources?.projectsMd ?? { revision: seedRevision, importedAt: new Date().toISOString() },
    };
    saveDb(db);
  } catch {
    // Ignore persistence failures (e.g. storage disabled).
  }
}

