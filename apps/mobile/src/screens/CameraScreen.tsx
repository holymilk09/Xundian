import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { GradientButton } from '../components/GradientButton';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';
import { addWatermark, capturePhoto, uploadVisitPhoto } from '../services/camera';
import { getCurrentPosition } from '../services/location';
import { api } from '../services/api';
import { useAuthStore } from '../stores/useAuthStore';
import type { RootStackParamList } from '../navigation/RootNavigator';

type CameraRouteProp = RouteProp<RootStackParamList, 'Camera'>;

export function CameraScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<CameraRouteProp>();
  const { storeId, visitId } = route.params;
  const employee = useAuthStore((s) => s.employee);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastWatermark, setLastWatermark] = useState<string[]>([]);

  const handleCapture = async () => {
    if (!visitId) {
      Alert.alert(
        t('takePhoto'),
        i18n.language === 'en'
          ? 'Check in before taking visit photos.'
          : '请先签到，再拍摄巡店照片。',
      );
      return;
    }

    try {
      setIsUploading(true);
      const photo = await capturePhoto();
      const [location, storeResponse] = await Promise.all([
        getCurrentPosition(),
        api.get(`/stores/${storeId}`),
      ]);
      const capturedAt = new Date();
      const date = capturedAt.toISOString().slice(0, 10);
      const time = capturedAt.toTimeString().slice(0, 5);
      const storeName = storeResponse.data.data?.name || storeId;
      const repName = employee?.name || '';
      const watermarkedUri = await addWatermark(photo.uri, {
        date,
        time,
        latitude: location.latitude,
        longitude: location.longitude,
        storeName,
        repName,
      });
      await uploadVisitPhoto(visitId, { ...photo, uri: watermarkedUri });
      setLastWatermark([
        `${date} ${time}`,
        `GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        `Store: ${storeName}`,
        `Rep: ${repName || '--'}`,
      ]);
      setPhotoTaken(true);
    } catch (error) {
      Alert.alert(
        t('takePhoto'),
        error instanceof Error
          ? error.message
          : i18n.language === 'en'
            ? 'Camera is not available in this build.'
            : '当前版本无法使用相机。',
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('takePhoto')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Camera Preview Placeholder */}
      <View style={styles.previewArea}>
        <Text style={styles.previewText}>
          {i18n.language === 'en'
            ? 'Camera preview will appear here'
            : '相机预览区域'}
        </Text>
        <Text style={styles.previewSubtext}>
          {visitId
            ? i18n.language === 'en'
              ? `Visit ${visitId.slice(0, 8)}`
              : `巡店记录 ${visitId.slice(0, 8)}`
            : i18n.language === 'en'
              ? 'Check-in required before photos'
              : '拍照前需要先签到'}
        </Text>
      </View>

      {/* Watermark Preview */}
      <View style={styles.watermarkPreview}>
        <Text style={styles.watermarkTitle}>
          {i18n.language === 'en' ? 'Watermark Preview' : '水印预览'}
        </Text>
        {(lastWatermark.length > 0
          ? lastWatermark
          : [
              i18n.language === 'en'
                ? 'Captured photo metadata will appear here.'
                : '拍摄后的照片元数据将在这里显示。',
            ]).map((line) => (
              <Text key={line} style={styles.watermarkLine}>{line}</Text>
            ))}
      </View>

      {/* Capture Button */}
      <View style={styles.controls}>
        {photoTaken ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              {i18n.language === 'en' ? 'Photo Saved' : '照片已保存'}
            </Text>
          </View>
        ) : (
          <GradientButton
            title={isUploading ? '...' : t('takePhoto')}
            onPress={handleCapture}
            disabled={!visitId || isUploading}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backText: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  placeholder: { width: 24 },
  previewArea: {
    flex: 1,
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  previewSubtext: {
    color: Colors.textDim,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
  watermarkPreview: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
  },
  watermarkTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  watermarkLine: {
    color: Colors.textMuted,
    fontSize: FontSize.sm - 1,
    lineHeight: 18,
  },
  controls: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  successBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    alignItems: 'center',
  },
  successText: {
    color: Colors.success,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
