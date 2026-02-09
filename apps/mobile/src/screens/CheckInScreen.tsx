import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { GradientButton } from '../components/GradientButton';
import { Colors, FontSize, BorderRadius, Spacing, StockStatusColors } from '../theme';
import { getCurrentPosition, isAccuracySufficient } from '../services/location';
import { GEOFENCE_RADIUS_M } from '../utils/constants';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { StockStatus } from '@xundian/shared';

type CheckInRouteProp = RouteProp<RootStackParamList, 'CheckIn'>;

const STOCK_OPTIONS: { key: StockStatus; i18nKey: string }[] = [
  { key: 'in_stock', i18nKey: 'inStock' },
  { key: 'low_stock', i18nKey: 'lowStock' },
  { key: 'out_of_stock', i18nKey: 'outOfStock' },
  { key: 'added_product', i18nKey: 'addedProduct' },
];

export function CheckInScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<CheckInRouteProp>();
  const { storeId } = route.params;

  const [stockStatus, setStockStatus] = useState<StockStatus>('in_stock');
  const [notes, setNotes] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);

  useEffect(() => {
    getCurrentPosition()
      .then((loc) =>
        setLocation({
          lat: loc.latitude,
          lng: loc.longitude,
          accuracy: loc.accuracy,
        }),
      )
      .catch(() => {});
  }, []);

  const handleCheckIn = () => {
    if (!location) {
      Alert.alert(
        t('checkIn'),
        i18n.language === 'en' ? 'Waiting for GPS...' : '正在获取定位...',
      );
      return;
    }
    if (!isAccuracySufficient(location.accuracy)) {
      Alert.alert(
        t('gpsAccuracy'),
        i18n.language === 'en'
          ? `GPS accuracy ${location.accuracy.toFixed(0)}m is too low`
          : `定位精度${location.accuracy.toFixed(0)}m不够`,
      );
      return;
    }
    setCheckedIn(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('checkIn')}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* GPS Info */}
        <View style={styles.gpsBox}>
          <Text style={styles.gpsLabel}>{t('gpsAccuracy')}</Text>
          <Text
            style={[
              styles.gpsValue,
              {
                color: location
                  ? isAccuracySufficient(location.accuracy)
                    ? Colors.success
                    : Colors.warning
                  : Colors.textMuted,
              },
            ]}
          >
            {location
              ? `${location.accuracy.toFixed(0)}m`
              : i18n.language === 'en'
                ? 'Acquiring...'
                : '获取中...'}
          </Text>
          {location && (
            <Text style={styles.gpsCoords}>
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </Text>
          )}
        </View>

        {checkedIn ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{t('checkedIn')}</Text>
            <Text style={styles.successMeta}>
              {new Date().toISOString().slice(0, 16).replace('T', ' ')}
            </Text>
          </View>
        ) : (
          <GradientButton
            title={t('checkIn')}
            onPress={handleCheckIn}
            colorFrom={Colors.success}
          />
        )}

        {/* Stock Status Selector */}
        <View style={styles.stockSection}>
          <Text style={styles.stockLabel}>{t('stockStatus')}</Text>
          <View style={styles.stockRow}>
            {STOCK_OPTIONS.map((opt) => {
              const isSelected = stockStatus === opt.key;
              const color = StockStatusColors[opt.key];
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setStockStatus(opt.key)}
                  style={[
                    styles.stockButton,
                    isSelected && {
                      borderColor: color,
                      borderWidth: 2,
                      backgroundColor: color + '15',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stockButtonText,
                      isSelected && { color },
                    ]}
                  >
                    {t(opt.i18nKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>{t('addNotes')}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={
              i18n.language === 'en'
                ? 'Any observations...'
                : '填写备注信息...'
            }
            placeholderTextColor={Colors.textDim}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
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
  content: {
    padding: Spacing.xxl,
    gap: Spacing.xl,
  },
  gpsBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  gpsLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  gpsValue: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  gpsCoords: {
    color: Colors.textDim,
    fontSize: FontSize.sm - 1,
    marginTop: 4,
  },
  successBox: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    alignItems: 'center',
  },
  successText: {
    color: Colors.success,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  successMeta: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 4,
  },
  stockSection: {
    gap: Spacing.sm,
  },
  stockLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  stockRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stockButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: Colors.surface,
  },
  stockButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  notesSection: {
    gap: Spacing.sm,
  },
  notesLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  notesInput: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    minHeight: 80,
  },
});
