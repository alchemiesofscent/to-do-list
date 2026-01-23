import type { AcademicTask } from './types.ts';
import type { SyncStatus } from './sync.ts';

export async function switchNamespaceAndPullMerge(params: {
  nextUserId: string;
  localTasks: AcademicTask[];
  setUserIdExplicit: (userId: string) => void;
  resetSyncState: () => void;
  runInitialPullMerge: (params: {
    localTasks: AcademicTask[];
    pullFromCloud: () => Promise<AcademicTask[] | null>;
    mergeTasks: (localTasks: AcademicTask[], cloudTasks: AcademicTask[]) => AcademicTask[];
    markPulledOnce: () => void;
  }) => Promise<{ status: SyncStatus; mergedTasks: AcademicTask[] }>;
  pullFromCloud: () => Promise<AcademicTask[] | null>;
  mergeTasks: (localTasks: AcademicTask[], cloudTasks: AcademicTask[]) => AcademicTask[];
  markPulledOnce: () => void;
}): Promise<{ status: SyncStatus; mergedTasks: AcademicTask[] }> {
  const {
    nextUserId,
    localTasks,
    setUserIdExplicit,
    resetSyncState,
    runInitialPullMerge,
    pullFromCloud,
    mergeTasks,
    markPulledOnce,
  } = params;

  setUserIdExplicit(nextUserId);
  resetSyncState();

  return runInitialPullMerge({
    localTasks,
    pullFromCloud,
    mergeTasks,
    markPulledOnce,
  });
}

