import { describe, expect, it } from 'vitest';

import type { AcademicTask } from '../src/types.ts';
import { runInitialPullMerge } from '../src/initialSync.ts';

function task(id: string, updatedAt?: string): AcademicTask {
  return {
    id,
    title: id,
    type: 'Article',
    priority: 'Medium',
    status: 'Draft',
    description: '',
    updatedAt,
  };
}

describe('initial pull/merge', () => {
  it('pulls and merges without any push side-effects', async () => {
    const local = [task('l1', '2024-01-01T00:00:00.000Z')];
    const cloud = [task('c1', '2024-02-01T00:00:00.000Z')];

    let pulled = 0;
    let marked = 0;

    const result = await runInitialPullMerge({
      localTasks: local,
      pullFromCloud: async () => {
        pulled++;
        return cloud;
      },
      mergeTasks: (localTasks, cloudTasks) => [...cloudTasks, ...localTasks],
      markPulledOnce: () => {
        marked++;
      },
    });

    expect(pulled).toBe(1);
    expect(marked).toBe(1);
    expect(result.status).toBe('synced');
    expect(result.mergedTasks.map((t) => t.id)).toEqual(['c1', 'l1']);
  });
});

