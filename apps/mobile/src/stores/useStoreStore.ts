import { create } from 'zustand';
import { api } from '../services/api';
import type { Store, StoreTier, StoreType, StockStatus } from '@xundian/shared';

interface StoreFilters {
  tier?: StoreTier;
  type?: StoreType;
  status?: string;
}

interface StoreState {
  stores: Store[];
  selectedStore: Store | null;
  filters: StoreFilters;
  isLoading: boolean;

  fetchStores: () => Promise<void>;
  selectStore: (store: Store | null) => void;
  setFilters: (filters: Partial<StoreFilters>) => void;
  clearFilters: () => void;
}

export const useStoreStore = create<StoreState>()((set, get) => ({
  stores: [],
  selectedStore: null,
  filters: {},
  isLoading: false,

  fetchStores: async () => {
    set({ isLoading: true });
    try {
      const { filters } = get();
      const params: Record<string, string> = {};
      if (filters.tier) params.tier = filters.tier;
      if (filters.type) params.store_type = filters.type;

      const response = await api.get('/stores', { params });
      set({ stores: response.data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  selectStore: (store) => {
    set({ selectedStore: store });
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  clearFilters: () => {
    set({ filters: {} });
  },
}));
