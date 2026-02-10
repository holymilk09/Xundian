import pool from '../db/pool.js';
import type { RouteWaypoint } from '@xundian/shared';

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

interface StorePoint {
  store_id: string;
  name: string;
  name_zh: string | null;
  tier: string;
  lat: number;
  lng: number;
}

export interface OptimizeRouteResult {
  waypoints: RouteWaypoint[];
  total_distance_km: number;
  estimated_duration_minutes: number;
}

/**
 * Main route optimization function.
 *
 * 1. If no storeIds: query uncompleted revisit_schedule for this employee
 *    + stores overdue based on company tier_config
 * 2. Fetch store locations/names/tiers from DB
 * 3. Estimate duration per tier: A=30min, B=20min, C=15min
 * 4. Build matrix (index 0 = start location), run nearest-neighbor, apply 2-opt
 * 5. Calculate arrival times assuming 25 km/h avg speed
 * 6. Return waypoints, total_distance_km, estimated_duration_minutes
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
    // Fetch specific stores
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
    }));
  } else {
    // Get stores from uncompleted revisit schedules assigned to this employee
    const scheduledResult = await pool.query(
      `SELECT DISTINCT s.id as store_id, s.name, s.name_zh, s.tier,
              ST_Y(s.location) as lat, ST_X(s.location) as lng
       FROM revisit_schedule rs
       JOIN stores s ON s.id = rs.store_id
       WHERE rs.company_id = $1
         AND rs.assigned_to = $2
         AND NOT rs.completed
         AND rs.next_visit_date <= $3::date`,
      [companyId, employeeId, date],
    );

    // Also get stores overdue based on tier_config (not visited within their tier window)
    const tierConfigResult = await pool.query(
      `SELECT tier_config FROM companies WHERE id = $1`,
      [companyId],
    );

    const tierConfig = tierConfigResult.rows[0]?.tier_config || {
      A: { revisit_days: 7 },
      B: { revisit_days: 14 },
      C: { revisit_days: 30 },
    };

    const overdueResult = await pool.query(
      `SELECT DISTINCT s.id as store_id, s.name, s.name_zh, s.tier,
              ST_Y(s.location) as lat, ST_X(s.location) as lng
       FROM stores s
       LEFT JOIN LATERAL (
         SELECT v.checked_in_at
         FROM visits v
         WHERE v.store_id = s.id AND v.company_id = s.company_id
         ORDER BY v.checked_in_at DESC LIMIT 1
       ) lv ON true
       WHERE s.company_id = $1
         AND (
           (s.tier = 'A' AND (lv.checked_in_at IS NULL OR lv.checked_in_at < NOW() - ($2::int || ' days')::interval))
           OR (s.tier = 'B' AND (lv.checked_in_at IS NULL OR lv.checked_in_at < NOW() - ($3::int || ' days')::interval))
           OR (s.tier = 'C' AND (lv.checked_in_at IS NULL OR lv.checked_in_at < NOW() - ($4::int || ' days')::interval))
         )`,
      [
        companyId,
        tierConfig.A?.revisit_days || 7,
        tierConfig.B?.revisit_days || 14,
        tierConfig.C?.revisit_days || 30,
      ],
    );

    // Merge and deduplicate
    const storeMap = new Map<string, StorePoint>();
    for (const row of [...scheduledResult.rows, ...overdueResult.rows]) {
      if (!storeMap.has(row.store_id as string)) {
        storeMap.set(row.store_id as string, {
          store_id: row.store_id as string,
          name: row.name as string,
          name_zh: row.name_zh as string | null,
          tier: row.tier as string,
          lat: parseFloat(row.lat as string),
          lng: parseFloat(row.lng as string),
        });
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

  // Build distance matrix
  const matrix = buildDistanceMatrix(points);

  // Run nearest-neighbor starting from index 0 (rep's position)
  let tour = nearestNeighbor(matrix, 0);

  // Improve with 2-opt
  tour = twoOpt(matrix, tour);

  // Calculate total distance (only store-to-store segments, skip start point for return)
  let totalDistanceKm = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    totalDistanceKm += matrix[tour[i]!]![tour[i + 1]!]!;
  }

  // Build waypoints with arrival time estimates
  const waypoints: RouteWaypoint[] = [];
  let cumulativeMinutes = 0;
  const baseTime = new Date(`${date}T08:00:00`); // Assume 8 AM start

  for (let i = 1; i < tour.length; i++) {
    const storeIndex = tour[i]! - 1; // Subtract 1 because index 0 is start location
    const store = stores[storeIndex]!;

    // Travel time from previous point
    const travelDistKm = matrix[tour[i - 1]!]![tour[i]!]!;
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
