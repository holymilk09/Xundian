import { create } from 'zustand';
import { api } from '../services/api';
import { getCurrentPosition } from '../services/location';
import type { DailyRoute, RouteWaypoint } from '@xundian/shared';

interface RouteState {
  todayRoute: DailyRoute | null;
  waypoints: RouteWaypoint[];
  isNavigating: boolean;
  isLoading: boolean;
  error: string | null;

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
  error: null,

  loadTodayRoute: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/routes/today');
      const route: DailyRoute | null = response.data.data;
      set({
        todayRoute: route,
        waypoints: route?.waypoints ?? [],
        isLoading: false,
        error: null,
      });
    } catch {
      set({ isLoading: false, error: 'Unable to load route.' });
    }
  },

  optimizeRoute: async () => {
    set({ isLoading: true, error: null });
    try {
      const position = await getCurrentPosition();
      const response = await api.post('/routes', {
        start_lat: position.latitude,
        start_lng: position.longitude,
      });
      const route: DailyRoute = response.data.data;
      set({
        todayRoute: route,
        waypoints: route.waypoints,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unable to optimize route.',
      });
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
