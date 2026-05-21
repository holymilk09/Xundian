import pool from '../db/pool.js';
import { searchRetailPoisAround } from './gaode.js';

export interface DiscoveredStore {
  name: string;
  name_zh: string;
  latitude: number;
  longitude: number;
  address: string;
  distance_m: number;
  gaode_poi_id: string;
  source: 'gaode' | 'mock';
  coordinate_system?: 'gcj02' | 'input';
}

/**
 * Discover nearby stores using Gaode POI API or mock data.
 *
 * If GAODE_API_KEY is set: calls Gaode /v3/place/around API, filters out
 * stores already in the DB for this company.
 *
 * If not set and demo mode is enabled: returns 5 mock stores near the given
 * coordinates. Pilot/build environments return an empty list instead of
 * fabricating stores.
 */
export async function discoverNearbyStores(
  companyId: string,
  lat: number,
  lng: number,
  radiusM: number = 2000,
): Promise<DiscoveredStore[]> {
  const gaodeApiKey = process.env.GAODE_WEB_SERVICE_KEY || process.env.GAODE_API_KEY;

  if (gaodeApiKey) {
    return discoverViaGaode(companyId, lat, lng, radiusM);
  }

  const demoMode = process.env.DEMO_MODE === 'true' || process.env.ENABLE_DEMO_DATA === 'true';
  if (demoMode) {
    return discoverMock(lat, lng);
  }

  return [];
}

async function discoverViaGaode(
  companyId: string,
  lat: number,
  lng: number,
  radiusM: number,
): Promise<DiscoveredStore[]> {
  const pois = await searchRetailPoisAround({ lat, lng }, radiusM);

  // Get existing gaode_poi_ids for this company to filter out duplicates
  const existingResult = await pool.query(
    `SELECT gaode_poi_id FROM stores WHERE company_id = $1 AND gaode_poi_id IS NOT NULL`,
    [companyId],
  );
  const existingPoiIds = new Set(existingResult.rows.map((r: Record<string, unknown>) => r.gaode_poi_id as string));

  const stores: DiscoveredStore[] = [];

  for (const poi of pois) {
    if (existingPoiIds.has(poi.id)) continue;

    stores.push({
      name: poi.name,
      name_zh: poi.name,
      latitude: poi.latitude,
      longitude: poi.longitude,
      address: poi.address || '',
      distance_m: poi.distance_m,
      gaode_poi_id: poi.id,
      source: 'gaode',
      coordinate_system: 'gcj02',
    });
  }

  return stores;
}

function discoverMock(lat: number, lng: number): DiscoveredStore[] {
  // Generate 5 mock stores near the given coordinates with realistic Chengdu names
  const mockStores: Array<{
    name: string;
    name_zh: string;
    latOffset: number;
    lngOffset: number;
    address: string;
  }> = [
    {
      name: 'Hongqi Supermarket Branch',
      name_zh: '红旗超市分店',
      latOffset: 0.002,
      lngOffset: 0.001,
      address: '锦江区大慈寺路123号',
    },
    {
      name: 'Wudongfeng Convenience',
      name_zh: '舞东风便利店',
      latOffset: -0.001,
      lngOffset: 0.003,
      address: '武侯区科华北路456号',
    },
    {
      name: 'WOWO Convenience',
      name_zh: 'WOWO便利店',
      latOffset: 0.003,
      lngOffset: -0.002,
      address: '青羊区宽窄巷子旁789号',
    },
    {
      name: 'Zhang Ma Small Shop',
      name_zh: '张妈小卖部',
      latOffset: -0.002,
      lngOffset: -0.001,
      address: '金牛区茶店子路321号',
    },
    {
      name: 'Huhui Supermarket',
      name_zh: '互惠超市',
      latOffset: 0.001,
      lngOffset: 0.002,
      address: '高新区剑南大道654号',
    },
  ];

  return mockStores.map((store, index) => {
    const storeLat = lat + store.latOffset;
    const storeLng = lng + store.lngOffset;
    // Rough distance in meters from offset (1 degree lat ~ 111km)
    const distanceM = Math.round(
      Math.sqrt(
        Math.pow(store.latOffset * 111000, 2) + Math.pow(store.lngOffset * 111000 * Math.cos((lat * Math.PI) / 180), 2),
      ),
    );

    return {
      name: store.name,
      name_zh: store.name_zh,
      latitude: storeLat,
      longitude: storeLng,
      address: store.address,
      distance_m: distanceM,
      gaode_poi_id: `mock_poi_${index + 1}_${Date.now()}`,
      source: 'mock' as const,
    };
  });
}
