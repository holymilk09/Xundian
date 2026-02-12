export type RoutePriority = 'overdue' | 'due_today' | 'high_value_nearby';

export interface RouteWaypoint {
  store_id: string;
  store_name: string;
  store_name_zh?: string;
  latitude: number;
  longitude: number;
  tier?: string;
  priority?: RoutePriority;
  estimated_arrival: string;
  estimated_duration_minutes: number;
  sequence: number;
  visited: boolean;
}

export interface DailyRoute {
  id: string;
  employee_id: string;
  company_id: string;
  date: string;
  waypoints: RouteWaypoint[];
  total_distance_km: number;
  estimated_duration_minutes: number;
  optimized: boolean;
  created_at: string;
  updated_at?: string;
}

export interface OptimizeRouteRequest {
  start_lat: number;
  start_lng: number;
  date?: string; // YYYY-MM-DD, defaults to today
  store_ids?: string[];
}

export interface OptimizeRouteResponse {
  route: DailyRoute;
  waypoints: RouteWaypoint[];
  total_distance_km: number;
  estimated_duration_minutes: number;
}
