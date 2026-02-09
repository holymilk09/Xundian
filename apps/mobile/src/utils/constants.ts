export const API_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://api.xundian.app/api/v1';

export const GPS_ACCURACY_THRESHOLD_M = 50;
export const GEOFENCE_RADIUS_M = 200;
export const TIMESTAMP_DRIFT_TOLERANCE_MS = 5 * 60 * 1000;
export const PHOTO_MAX_SIZE_MB = 5;
export const PHOTO_COMPRESSION_QUALITY = 0.8;
export const DEFAULT_SEARCH_RADIUS_KM = 2;
export const SYNC_INTERVAL_MS = 5 * 60 * 1000;
