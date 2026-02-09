import { create } from 'zustand';

interface SyncState {
  lastSyncAt: number | null;
  isSyncing: boolean;
  pendingChanges: number;
  syncError: string | null;

  setSyncing: (syncing: boolean) => void;
  setSyncSuccess: () => void;
  setSyncError: (error: string) => void;
  setPendingChanges: (count: number) => void;
  resetSyncError: () => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
  lastSyncAt: null,
  isSyncing: false,
  pendingChanges: 0,
  syncError: null,

  setSyncing: (syncing) => set({ isSyncing: syncing, syncError: null }),

  setSyncSuccess: () =>
    set({
      isSyncing: false,
      lastSyncAt: Date.now(),
      pendingChanges: 0,
      syncError: null,
    }),

  setSyncError: (error) => set({ isSyncing: false, syncError: error }),

  setPendingChanges: (count) => set({ pendingChanges: count }),

  resetSyncError: () => set({ syncError: null }),
}));
