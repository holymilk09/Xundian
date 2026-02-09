import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation, {
  GeoPosition,
  GeoError,
} from 'react-native-geolocation-service';
import { GPS_ACCURACY_THRESHOLD_M } from '../utils/constants';
import { haversineDistance } from '../utils/geo';

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export async function getCurrentPosition(): Promise<LocationResult> {
  const hasPermission = await requestPermission();
  if (!hasPermission) {
    throw new Error('Location permission denied');
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position: GeoPosition) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error: GeoError) => {
        reject(new Error(`GPS error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  });
}

export function watchPosition(
  onLocation: (loc: LocationResult) => void,
  onError: (err: Error) => void,
): number {
  return Geolocation.watchPosition(
    (position: GeoPosition) => {
      onLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      });
    },
    (error: GeoError) => {
      onError(new Error(`GPS error: ${error.message}`));
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 10,
      interval: 5000,
      fastestInterval: 2000,
    },
  );
}

export function clearWatch(watchId: number): void {
  Geolocation.clearWatch(watchId);
}

export function isAccuracySufficient(accuracyM: number): boolean {
  return accuracyM <= GPS_ACCURACY_THRESHOLD_M;
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return haversineDistance(lat1, lng1, lat2, lng2);
}
