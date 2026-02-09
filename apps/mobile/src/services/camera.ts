import { Platform } from 'react-native';
import { PHOTO_COMPRESSION_QUALITY, PHOTO_MAX_SIZE_MB } from '../utils/constants';

export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
}

export interface WatermarkMetadata {
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  storeName: string;
  repName: string;
}

/**
 * Capture a photo using the device camera.
 * Actual camera integration requires react-native-camera or expo-camera.
 * This is the service interface that will wrap the native module.
 */
export async function capturePhoto(): Promise<PhotoResult> {
  // Camera module integration point.
  // In production, this wraps react-native-camera or react-native-image-picker.
  throw new Error(
    'Camera not available in this build. Install react-native-image-picker.',
  );
}

/**
 * Add watermark overlay to a photo with visit metadata.
 * Watermark includes: date, time, GPS coordinates, store name, rep name.
 * Standard practice in China field sales for proof-of-visit.
 */
export async function addWatermark(
  photoUri: string,
  metadata: WatermarkMetadata,
): Promise<string> {
  // Watermarking integration point.
  // In production, this uses a native module or canvas-based approach
  // to overlay text on the photo before upload.
  // The watermark text format:
  //   Date: 2026-02-09 14:23
  //   GPS: 31.2304, 121.4737
  //   Store: Yonghui Supermarket
  //   Rep: Zhang Wei

  // Return original URI as placeholder until native module is integrated
  return photoUri;
}

/**
 * Validate photo file size is within limits.
 */
export function isPhotoSizeValid(fileSizeBytes: number): boolean {
  return fileSizeBytes <= PHOTO_MAX_SIZE_MB * 1024 * 1024;
}
