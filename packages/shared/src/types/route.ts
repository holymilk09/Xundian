export interface RouteWaypoint {
  store_id: string;
  store_name: string;
  store_name_zh?: string;
  latitude: number;
  longitude: number;
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
}
