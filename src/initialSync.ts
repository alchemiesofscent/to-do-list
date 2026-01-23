import type { AcademicTask } from './types.ts';
import type { SyncStatus } from './sync.ts';

export async function runInitialPullMerge(params: {
  localTasks: AcademicTask[];
  pullFromCloud: () => Promise<AcademicTask[] | null>;
  mergeTasks: (localTasks: AcademicTask[], cloudTasks: AcademicTask[]) => AcademicTask[];
  markPulledOnce: () => void;
}): Promise<{ status: SyncStatus; mergedTasks: AcademicTask[] }> {
  const { localTasks, pullFromCloud, mergeTasks, markPulledOnce } = params;

  const cloudTasks = await pullFromCloud();
  if (cloudTasks === null) {
    return { status: 'error', mergedTasks: localTasks };
  }

  // Fresh client rule: always pull first; never push during mount-time sync.
  markPulledOnce();
  const mergedTasks = mergeTasks(localTasks, cloudTasks);
  return { status: 'synced', mergedTasks };
}

