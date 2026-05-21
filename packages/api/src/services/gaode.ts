import crypto from 'node:crypto';

const GAODE_BASE_URL = 'https://restapi.amap.com';

export interface GaodeReadiness {
  status: 'ready' | 'missing_key';
  provider: 'gaode';
  web_service_key_configured: boolean;
  web_service_signature_configured: boolean;
  js_key_configured: boolean;
  js_security_code_configured: boolean;
  demo_mode: boolean;
}

export interface CoordinatePoint {
  lat: number;
  lng: number;
}

export interface NormalizedCoordinate extends CoordinatePoint {
  coordinate_system: 'gcj02' | 'input';
}

interface GaodeResponse {
  status: string;
  info?: string;
  infocode?: string;
}

interface ConvertResponse extends GaodeResponse {
  locations?: string;
}

interface AroundSearchResponse extends GaodeResponse {
  pois?: Array<{
    id: string;
    name: string;
    location: string;
    address?: string | unknown[];
    distance?: string;
    typecode?: string;
    cityname?: string;
    adname?: string;
  }>;
}

export interface GaodePoi {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  distance_m: number;
  typecode?: string;
  city_name?: string;
  district_name?: string;
}

function webServiceKey(): string | undefined {
  return process.env.GAODE_WEB_SERVICE_KEY || process.env.GAODE_API_KEY;
}

function webServicePrivateKey(): string | undefined {
  return process.env.GAODE_WEB_SERVICE_PRIVATE_KEY || process.env.GAODE_SECURITY_SECRET;
}

function demoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.ENABLE_DEMO_DATA === 'true';
}

export function getGaodeReadiness(): GaodeReadiness {
  return {
    status: webServiceKey() ? 'ready' : 'missing_key',
    provider: 'gaode',
    web_service_key_configured: Boolean(webServiceKey()),
    web_service_signature_configured: Boolean(webServicePrivateKey()),
    js_key_configured: Boolean(process.env.GAODE_JS_KEY || process.env.NEXT_PUBLIC_GAODE_JS_KEY),
    js_security_code_configured: Boolean(process.env.GAODE_JS_SECURITY_CODE || process.env.NEXT_PUBLIC_GAODE_SECURITY_JS_CODE),
    demo_mode: demoMode(),
  };
}

function signParams(params: Record<string, string>, privateKey: string): string {
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto
    .createHash('md5')
    .update(`${canonical}${privateKey}`, 'utf8')
    .digest('hex');
}

function buildUrl(path: string, params: Record<string, string>): string {
  const key = webServiceKey();
  if (!key) {
    throw new Error('GAODE_WEB_SERVICE_KEY or GAODE_API_KEY is required');
  }

  const signedParams: Record<string, string> = {
    ...params,
    key,
    output: params.output || 'JSON',
  };

  const privateKey = webServicePrivateKey();
  if (privateKey) {
    signedParams.sig = signParams(signedParams, privateKey);
  }

  const search = new URLSearchParams(signedParams);
  return `${GAODE_BASE_URL}${path}?${search.toString()}`;
}

async function requestGaode<T extends GaodeResponse>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const response = await fetch(buildUrl(path, params));
  if (!response.ok) {
    throw new Error(`Gaode request failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as T;
  if (data.status !== '1') {
    throw new Error(`Gaode request failed: ${data.info || data.infocode || 'unknown error'}`);
  }

  return data;
}

function formatPoint(point: CoordinatePoint): string {
  return `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`;
}

function parsePoint(value: string): CoordinatePoint | null {
  const [lng, lat] = value.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat: lat!, lng: lng! };
}

export async function convertCoordinatesToGaode(
  points: CoordinatePoint[],
  coordsys: 'gps' | 'mapbar' | 'baidu' | 'autonavi' = 'gps',
): Promise<NormalizedCoordinate[]> {
  if (!webServiceKey() || points.length === 0) {
    return points.map((point) => ({ ...point, coordinate_system: 'input' }));
  }

  const chunks: CoordinatePoint[][] = [];
  for (let i = 0; i < points.length; i += 40) {
    chunks.push(points.slice(i, i + 40));
  }

  const converted: NormalizedCoordinate[] = [];
  for (const chunk of chunks) {
    const data = await requestGaode<ConvertResponse>('/v3/assistant/coordinate/convert', {
      locations: chunk.map(formatPoint).join('|'),
      coordsys,
    });

    const parsed = (data.locations || '')
      .split(';')
      .map(parsePoint);

    chunk.forEach((fallback, index) => {
      const point = parsed[index];
      converted.push(point
        ? { ...point, coordinate_system: 'gcj02' }
        : { ...fallback, coordinate_system: 'input' });
    });
  }

  return converted;
}

export async function convertGpsToGaode(point: CoordinatePoint): Promise<NormalizedCoordinate> {
  const [converted] = await convertCoordinatesToGaode([point], 'gps');
  return converted || { ...point, coordinate_system: 'input' };
}

function normalizeAddress(address: string | unknown[] | undefined): string {
  if (Array.isArray(address)) return '';
  return address || '';
}

export async function searchRetailPoisAround(
  point: CoordinatePoint,
  radiusM: number,
): Promise<GaodePoi[]> {
  const gaodePoint = await convertGpsToGaode(point);
  const data = await requestGaode<AroundSearchResponse>('/v3/place/around', {
    location: formatPoint(gaodePoint),
    keywords: '超市|便利店|小卖部|商店',
    types: '060100|060101|060102|060300|060301|060302',
    radius: String(Math.min(Math.max(radiusM, 100), 3000)),
    offset: '20',
    page: '1',
    extensions: 'all',
  });

  return (data.pois || []).flatMap((poi) => {
    const point = parsePoint(poi.location);
    if (!point) return [];

    return [{
      id: poi.id,
      name: poi.name,
      latitude: point.lat,
      longitude: point.lng,
      address: normalizeAddress(poi.address),
      distance_m: parseInt(poi.distance || '0', 10) || 0,
      typecode: poi.typecode,
      city_name: poi.cityname,
      district_name: poi.adname,
    }];
  });
}
