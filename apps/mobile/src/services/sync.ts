import { syncDatabase } from '../db/sync';
import { useSyncStore } from '../stores/useSyncStore';

/**
 * Orchestrate a full sync cycle:
 * 1. Mark sync as in progress
 * 2. Run WatermelonDB sync with backend
 * 3. Update sync status
 */
export async function performSync(): Promise<void> {
  const store = useSyncStore.getState();

  if (store.isSyncing) {
    return;
  }

  store.setSyncing(true);

  try {
    await syncDatabase();
    store.setSyncSuccess();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown sync error';
    store.setSyncError(message);
    throw error;
  }
}
