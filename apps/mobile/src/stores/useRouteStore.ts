import { create } from 'zustand';
import { api } from '../services/api';
import { DEFAULT_ROUTE_START_LAT, DEFAULT_ROUTE_START_LNG } from '../utils/constants';
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
      const route: DailyRoute | null = response.data.data;
      set({
        todayRoute: route,
        waypoints: route?.waypoints ?? [],
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  optimizeRoute: async () => {
    set({ isLoading: true });
    try {
      const response = await api.post('/routes', {
        start_lat: DEFAULT_ROUTE_START_LAT,
        start_lng: DEFAULT_ROUTE_START_LNG,
      });
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
