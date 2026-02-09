import { create } from 'zustand';
import { api } from '../services/api';
import type { DailyRoute, RouteWaypoint } from '@xundian/shared';

interface RouteState {
  todayRoute: DailyRoute | null;
  waypoints: RouteWaypoint[];
  isNavigating: boolean;
  isLoading: boolean;

  loadTodayRoute: () => Promise<void>;
  optimizeRoute: () => Promise<void>;
  markWaypointVisited: (storeId: string) => void;
  startNavigation: () => void;
  stopNavigation: () => void;
}

export const useRouteStore = create<RouteState>()((set, get) => ({
  todayRoute: null,
  waypoints: [],
  isNavigating: false,
  isLoading: false,

  loadTodayRoute: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/routes/today');
      const route: DailyRoute = response.data.data;
      set({
        todayRoute: route,
        waypoints: route.waypoints,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  optimizeRoute: async () => {
    set({ isLoading: true });
    try {
      const response = await api.post('/routes/optimize');
      const route: DailyRoute = response.data.data;
      set({
        todayRoute: route,
        waypoints: route.waypoints,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  markWaypointVisited: (storeId) => {
    set((state) => ({
      waypoints: state.waypoints.map((wp) =>
        wp.store_id === storeId ? { ...wp, visited: true } : wp,
      ),
    }));
  },

  startNavigation: () => set({ isNavigating: true }),
  stopNavigation: () => set({ isNavigating: false }),
}));
