import pool from '../db/pool.js';
import type { RouteWaypoint, RoutePriority } from '@xundian/shared';

/**
 * Calculate the Haversine distance between two points in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Build a symmetric N x N distance matrix from an array of {lat, lng} points.
 * Index 0 is typically the start location (rep's current position).
 */
export function buildDistanceMatrix(points: { lat: number; lng: number }[]): number[][] {
  const n = points.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = haversineDistanceKm(
        points[i]!.lat,
        points[i]!.lng,
        points[j]!.lat,
        points[j]!.lng,
      );
      matrix[i]![j] = dist;
      matrix[j]![i] = dist;
    }
  }

  return matrix;
}

/**
 * Nearest-neighbor heuristic: greedily build a tour starting from startIndex.
 * Start index is fixed at position 0 in the returned tour.
 */
export function nearestNeighbor(matrix: number[][], startIndex: number): number[] {
  const n = matrix.length;
  const visited = new Set<number>();
  const tour: number[] = [startIndex];
  visited.add(startIndex);

  let current = startIndex;
  for (let step = 1; step < n; step++) {
    let nearest = -1;
    let nearestDist = Infinity;

    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && matrix[current]![j]! < nearestDist) {
        nearest = j;
        nearestDist = matrix[current]![j]!;
      }
    }

    if (nearest === -1) break;
    tour.push(nearest);
    visited.add(nearest);
    current = nearest;
  }

  return tour;
}

/**
 * Calculate the total distance of a tour given a distance matrix.
 */
function tourDistance(matrix: number[][], tour: number[]): number {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    total += matrix[tour[i]!]![tour[i + 1]!]!;
  }
  return total;
}

/**
 * 2-opt improvement: iteratively reverse segments to shorten the tour.
 * Keeps start (index 0 in tour) fixed. Max 200 iterations.
 */
export function twoOpt(matrix: number[][], tour: number[]): number[] {
  let improved = true;
  let iterations = 0;
  const maxIterations = 200;
  let bestTour = [...tour];
  let bestDistance = tourDistance(matrix, bestTour);

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // Start from index 1 to keep the start position fixed
    for (let i = 1; i < bestTour.length - 1; i++) {
      for (let j = i + 1; j < bestTour.length; j++) {
        // Reverse the segment between i and j
        const newTour = [
          ...bestTour.slice(0, i),
          ...bestTour.slice(i, j + 1).reverse(),
          ...bestTour.slice(j + 1),
        ];
        const newDistance = tourDistance(matrix, newTour);

        if (newDistance < bestDistance) {
          bestTour = newTour;
          bestDistance = newDistance;
          improved = true;
        }
      }
    }
  }

  return bestTour;
}

/** Duration estimate per tier in minutes */
const TIER_DURATION: Record<string, number> = {
  A: 30,
  B: 20,
  C: 15,
};

/** Average travel speed in km/h */
const AVG_SPEED_KMH = 25;

/** Priority weight multipliers for distance matrix */
const PRIORITY_WEIGHTS: Record<RoutePriority, number> = {
  overdue: 0.5,
  due_today: 0.8,
  high_value_nearby: 1.2,
};

/** Max stores per day */
const MAX_STORES_PER_DAY = 20;

interface StorePoint {
  store_id: string;
  name: string;
  name_zh: string | null;
  tier: string;
  lat: number;
  lng: number;
  priority: RoutePriority;
  days_overdue?: number;
}

export interface OptimizeRouteResult {
  waypoints: RouteWaypoint[];
  total_distance_km: number;
  estimated_duration_minutes: number;
}

/**
 * Main route optimization function with priority buckets.
 *
 * Priority buckets (filled in order, capped at MAX_STORES_PER_DAY):
 * 1. OVERDUE — revisit_schedule past due + stores past tier window (sorted by days overdue DESC)
 * 2. DUE TODAY — revisit_schedule for today
 * 3. HIGH VALUE NEARBY — A-tier stores within 10km not visited in 3 days
 *
 * Applies priority weights to distance matrix for TSP:
 * - Overdue: 0.5x (appear closer → visited earlier)
 * - Due today: 0.8x
 * - High value nearby: 1.2x (slight penalty)
 *
 * Uses unweighted matrix for final distance/time calculations.
 */
export async function optimizeRoute(
  companyId: string,
  employeeId: string,
  date: string,
  startLat: number,
  startLng: number,
  storeIds?: string[],
): Promise<OptimizeRouteResult> {
  let stores: StorePoint[];

  if (storeIds && storeIds.length > 0) {
    // Fetch specific stores (no priority buckets)
    const result = await pool.query(
      `SELECT s.id as store_id, s.name, s.name_zh, s.tier,
              ST_Y(s.location) as lat, ST_X(s.location) as lng
       FROM stores s
       WHERE s.id = ANY($1) AND s.company_id = $2`,
      [storeIds, companyId],
    );
    stores = result.rows.map((r: Record<string, unknown>) => ({
      store_id: r.store_id as string,
      name: r.name as string,
      name_zh: r.name_zh as string | null,
      tier: r.tier as string,
      lat: parseFloat(r.lat as string),
      lng: parseFloat(r.lng as string),
      priority: 'due_today' as RoutePriority,
    }));
  } else {
    // Get tier config
    const tierConfigResult = await pool.query(
      `SELECT tier_config FROM companies WHERE id = $1`,
      [companyId],
    );
    const tierConfig = tierConfigResult.rows[0]?.tier_config || {
      A: { revisit_days: 7 },
      B: { revisit_days: 14 },
      C: { revisit_days: 30 },
    };

    // BUCKET 1: OVERDUE — revisit_schedule past due + stores past tier window
    const overdueResult = await pool.query(
      `SELECT DISTINCT ON (s.id)
              s.id as store_id, s.name, s.name_zh, s.tier,
              ST_Y(s.location) as lat, ST_X(s.location) as lng,
              GREATEST(
                COALESCE(($4::date - rs.next_visit_date), 0),
                COALESCE(
                  EXTRACT(DAY FROM NOW() - lv.checked_in_at) -
                  CASE s.tier
                    WHEN 'A' THEN $5::int
                    WHEN 'B' THEN $6::int
                    WHEN 'C' THEN $7::int
                    ELSE 30
                  END,
                  0
                )
              ) AS days_overdue
       FROM stores s
       LEFT JOIN revisit_schedule rs ON rs.store_id = s.id
         AND rs.company_id = s.company_id
         AND NOT rs.completed
         AND rs.next_visit_date < $4::date
       LEFT JOIN LATERAL (
         SELECT v.checked_in_at
         FROM visits v
         WHERE v.store_id = s.id AND v.company_id = s.company_id
         ORDER BY v.checked_in_at DESC LIMIT 1
       ) lv ON true
       WHERE s.company_id = $1
         AND (
           (rs.id IS NOT NULL)
           OR (
             (s.tier = 'A' AND (lv.checked_in_at IS NULL OR lv.checked_in_at < NOW() - ($5::int || ' days')::interval))
             OR (s.tier = 'B' AND (lv.checked_in_at IS NULL OR lv.checked_in_at < NOW() - ($6::int || ' days')::interval))
             OR (s.tier = 'C' AND (lv.checked_in_at IS NULL OR lv.checked_in_at < NOW() - ($7::int || ' days')::interval))
           )
         )
       ORDER BY s.id, days_overdue DESC`,
      [
        companyId,
        employeeId,
        date,
        date,
        tierConfig.A?.revisit_days || 7,
        tierConfig.B?.revisit_days || 14,
        tierConfig.C?.revisit_days || 30,
      ],
    );

    const overdueStores: StorePoint[] = overdueResult.rows
      .map((r: Record<string, unknown>) => ({
        store_id: r.store_id as string,
        name: r.name as string,
        name_zh: r.name_zh as string | null,
        tier: r.tier as string,
        lat: parseFloat(r.lat as string),
        lng: parseFloat(r.lng as string),
        priority: 'overdue' as RoutePriority,
        days_overdue: Math.max(0, parseFloat(String(r.days_overdue || 0))),
      }))
      .sort((a, b) => (b.days_overdue || 0) - (a.days_overdue || 0));

    // BUCKET 2: DUE TODAY — revisit_schedule for today
    const dueTodayResult = await pool.query(
      `SELECT DISTINCT s.id as store_id, s.name, s.name_zh, s.tier,
              ST_Y(s.location) as lat, ST_X(s.location) as lng
       FROM revisit_schedule rs
       JOIN stores s ON s.id = rs.store_id
       WHERE rs.company_id = $1
         AND NOT rs.completed
         AND rs.next_visit_date = $2::date`,
      [companyId, date],
    );

    const dueTodayStores: StorePoint[] = dueTodayResult.rows.map((r: Record<string, unknown>) => ({
      store_id: r.store_id as string,
      name: r.name as string,
      name_zh: r.name_zh as string | null,
      tier: r.tier as string,
      lat: parseFloat(r.lat as string),
      lng: parseFloat(r.lng as string),
      priority: 'due_today' as RoutePriority,
    }));

    // BUCKET 3: HIGH VALUE NEARBY — A-tier within 10km, not visited in 3 days
    const highValueResult = await pool.query(
      `SELECT s.id as store_id, s.name, s.name_zh, s.tier,
              ST_Y(s.location) as lat, ST_X(s.location) as lng
       FROM stores s
       LEFT JOIN LATERAL (
         SELECT v.checked_in_at
         FROM visits v
         WHERE v.store_id = s.id AND v.company_id = s.company_id
         ORDER BY v.checked_in_at DESC LIMIT 1
       ) lv ON true
       WHERE s.company_id = $1
         AND s.tier = 'A'
         AND ST_DWithin(s.location::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, 10000)
         AND (lv.checked_in_at IS NULL OR lv.checked_in_at < NOW() - interval '3 days')`,
      [companyId, startLng, startLat],
    );

    const highValueStores: StorePoint[] = highValueResult.rows.map((r: Record<string, unknown>) => ({
      store_id: r.store_id as string,
      name: r.name as string,
      name_zh: r.name_zh as string | null,
      tier: r.tier as string,
      lat: parseFloat(r.lat as string),
      lng: parseFloat(r.lng as string),
      priority: 'high_value_nearby' as RoutePriority,
    }));

    // Merge and deduplicate: fill from bucket 1 first, then 2, then 3
    const storeMap = new Map<string, StorePoint>();

    for (const store of overdueStores) {
      if (storeMap.size >= MAX_STORES_PER_DAY) break;
      if (!storeMap.has(store.store_id)) {
        storeMap.set(store.store_id, store);
      }
    }
    for (const store of dueTodayStores) {
      if (storeMap.size >= MAX_STORES_PER_DAY) break;
      if (!storeMap.has(store.store_id)) {
        storeMap.set(store.store_id, store);
      }
    }
    for (const store of highValueStores) {
      if (storeMap.size >= MAX_STORES_PER_DAY) break;
      if (!storeMap.has(store.store_id)) {
        storeMap.set(store.store_id, store);
      }
    }

    stores = Array.from(storeMap.values());
  }

  // If no stores to visit, return empty result
  if (stores.length === 0) {
    return {
      waypoints: [],
      total_distance_km: 0,
      estimated_duration_minutes: 0,
    };
  }

  // Build points array: index 0 = start location, rest are stores
  const points: { lat: number; lng: number }[] = [
    { lat: startLat, lng: startLng },
    ...stores.map((s) => ({ lat: s.lat, lng: s.lng })),
  ];

  // Build unweighted distance matrix (for final calculations)
  const realMatrix = buildDistanceMatrix(points);

  // Build weighted distance matrix (for TSP optimization)
  const weightedMatrix = realMatrix.map((row, i) =>
    row.map((dist, j) => {
      if (j === 0 || i === 0) return dist; // don't weight start point
      const storeIndex = j - 1;
      const store = stores[storeIndex];
      if (!store) return dist;
      const weight = PRIORITY_WEIGHTS[store.priority] || 1.0;
      return dist * weight;
    }),
  );

  // Run nearest-neighbor on weighted matrix starting from index 0
  let tour = nearestNeighbor(weightedMatrix, 0);

  // Improve with 2-opt on weighted matrix
  tour = twoOpt(weightedMatrix, tour);

  // Calculate total distance using REAL (unweighted) matrix
  let totalDistanceKm = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    totalDistanceKm += realMatrix[tour[i]!]![tour[i + 1]!]!;
  }

  // Build waypoints with arrival time estimates using real distances
  const waypoints: RouteWaypoint[] = [];
  let cumulativeMinutes = 0;
  const baseTime = new Date(`${date}T08:00:00`); // Assume 8 AM start

  for (let i = 1; i < tour.length; i++) {
    const storeIndex = tour[i]! - 1; // Subtract 1 because index 0 is start location
    const store = stores[storeIndex]!;

    // Travel time from previous point (using real distances)
    const travelDistKm = realMatrix[tour[i - 1]!]![tour[i]!]!;
    const travelMinutes = (travelDistKm / AVG_SPEED_KMH) * 60;
    cumulativeMinutes += travelMinutes;

    const arrivalTime = new Date(baseTime.getTime() + cumulativeMinutes * 60 * 1000);
    const durationMinutes = TIER_DURATION[store.tier] || 15;

    waypoints.push({
      store_id: store.store_id,
      store_name: store.name,
      store_name_zh: store.name_zh || undefined,
      latitude: store.lat,
      longitude: store.lng,
      tier: store.tier,
      priority: store.priority,
      estimated_arrival: arrivalTime.toISOString(),
      estimated_duration_minutes: durationMinutes,
      sequence: i,
      visited: false,
    });

    // Add store visit duration to cumulative time
    cumulativeMinutes += durationMinutes;
  }

  const totalDurationMinutes = Math.round(cumulativeMinutes);

  return {
    waypoints,
    total_distance_km: Math.round(totalDistanceKm * 100) / 100,
    estimated_duration_minutes: totalDurationMinutes,
  };
}
