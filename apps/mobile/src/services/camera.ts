import { launchCamera } from 'react-native-image-picker';
import { PHOTO_COMPRESSION_QUALITY, PHOTO_MAX_SIZE_MB } from '../utils/constants';
import { api } from './api';

export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  fileName?: string;
  type?: string;
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
  const result = await launchCamera({
    mediaType: 'photo',
    cameraType: 'back',
    quality: PHOTO_COMPRESSION_QUALITY,
    saveToPhotos: false,
  });

  if (result.didCancel) {
    throw new Error('Photo capture cancelled');
  }

  if (result.errorMessage) {
    throw new Error(result.errorMessage);
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error('No photo captured');
  }

  const fileSize = asset.fileSize ?? 0;
  if (fileSize > 0 && !isPhotoSizeValid(fileSize)) {
    throw new Error(`Photo exceeds ${PHOTO_MAX_SIZE_MB}MB limit`);
  }

  return {
    uri: asset.uri,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    fileSize,
    fileName: asset.fileName,
    type: asset.type,
  };
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

export async function uploadVisitPhoto(
  visitId: string,
  photo: PhotoResult,
  photoType: 'shelf' | 'storefront' | 'other' = 'shelf',
): Promise<void> {
  const form = new FormData();
  form.append('photo_type', photoType);
  form.append('file', {
    uri: photo.uri,
    name: photo.fileName || `visit-${visitId}.jpg`,
    type: photo.type || 'image/jpeg',
  } as unknown as Blob);

  await api.post(`/visits/${visitId}/photos`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
