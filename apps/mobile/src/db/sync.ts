import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './index';
import { api } from '../services/api';
import type { SyncPullResponse } from '@xundian/shared';

export async function syncDatabase(): Promise<void> {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      const response = await api.get<SyncPullResponse>('/sync/pull', {
        params: { last_pulled_at: lastPulledAt ?? 0 },
      });
      const { changes, timestamp } = response.data;
      return { changes, timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      await api.post('/sync/push', {
        changes,
        last_pulled_at: lastPulledAt,
      });
    },
    migrationsEnabledAtVersion: 1,
  });
}
