import { describe, expect, it } from 'vitest';

import { installMockLocalStorage } from './testUtils.ts';
import { getSyncState, markPulledOnce, resetSyncStateForTestsOnly } from '../src/syncState.ts';
import { getUserIdFromStorage, setUserIdExplicit } from '../src/userNamespace.ts';
import { switchNamespaceAndPullMerge } from '../src/namespaceRecovery.ts';
import { runInitialPullMerge } from '../src/initialSync.ts';

describe('namespace recovery', () => {
  it('switching namespace resets pull state and triggers a pull-only merge', async () => {
    installMockLocalStorage({
      scholar_opus_user_id: 'old-namespace',
    });
    resetSyncStateForTestsOnly();
    markPulledOnce('2024-01-01T00:00:00.000Z');
    expect(getSyncState().hasPulledOnce).toBe(true);

    const result = await switchNamespaceAndPullMerge({
      nextUserId: 'correct-namespace',
      localTasks: [],
      setUserIdExplicit,
      resetSyncState: () => resetSyncStateForTestsOnly(),
      runInitialPullMerge,
      pullFromCloud: async () => {
        // reset must have happened before the pull begins
        expect(getSyncState().hasPulledOnce).toBe(false);
        return [];
      },
      mergeTasks: (localTasks, cloudTasks) => [...cloudTasks, ...localTasks],
      markPulledOnce: () => markPulledOnce('2024-01-02T00:00:00.000Z'),
    });

    expect(result.status).toBe('synced');
    expect(getUserIdFromStorage()).toBe('correct-namespace');
    expect(getSyncState().hasPulledOnce).toBe(true);
  });
});

