import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StoreCard } from '../components/StoreCard';
import { api } from '../services/api';
import { getCurrentPosition } from '../services/location';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';
import { DEFAULT_SEARCH_RADIUS_KM } from '../utils/constants';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Store } from '@xundian/shared';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function NearbyScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const [radius, setRadius] = useState(DEFAULT_SEARCH_RADIUS_KM);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError('');

    getCurrentPosition()
      .then((location) => api.get('/stores/nearby', {
        params: {
          lat: location.latitude,
          lng: location.longitude,
          radius_m: radius * 1000,
        },
      }))
      .then((response) => {
        if (mounted) setStores(response.data.data || []);
      })
      .catch((err) => {
        if (!mounted) return;
        setStores([]);
        setError(err instanceof Error ? err.message : 'Unable to load nearby stores.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [radius]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('nearbyStores')}</Text>
        <View style={styles.radiusRow}>
          {[1, 2, 5].map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRadius(r)}
              style={[
                styles.radiusButton,
                radius === r && styles.radiusButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.radiusText,
                  radius === r && styles.radiusTextActive,
                ]}
              >
                {r}{t('km')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.resultText}>
          {isLoading
            ? '...'
            : i18n.language === 'en'
              ? `Found ${stores.length} stores within ${radius}km`
              : `${radius}公里内发现${stores.length}家门店`}
        </Text>

        {error ? (
          <Text style={styles.emptyText}>{error}</Text>
        ) : null}
        {!isLoading && !error && stores.length === 0 && (
          <Text style={styles.emptyText}>
            {i18n.language === 'en'
              ? 'No approved stores found nearby.'
              : '附近暂无已批准门店。'}
          </Text>
        )}
        {stores.map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            visitStatus="pending"
            lastVisitDays={null}
            onPress={() => navigation.navigate('StoreDetail', { storeId: store.id })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  radiusButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  radiusButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radiusText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  radiusTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  resultText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
