import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientButton } from '../components/GradientButton';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';
import { useRouteStore } from '../stores/useRouteStore';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function RouteScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const todayRoute = useRouteStore((s) => s.todayRoute);
  const waypoints = useRouteStore((s) => s.waypoints);
  const isLoading = useRouteStore((s) => s.isLoading);
  const error = useRouteStore((s) => s.error);
  const loadTodayRoute = useRouteStore((s) => s.loadTodayRoute);
  const optimizeRoute = useRouteStore((s) => s.optimizeRoute);

  useEffect(() => {
    loadTodayRoute();
  }, [loadTodayRoute]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('todayRoute')}</Text>
        <Text style={styles.meta}>
          {waypoints.length} {t('stores')} {'\u00B7'} {todayRoute?.total_distance_km ?? '--'} {t('km')}
        </Text>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>
          {i18n.language === 'en'
            ? 'Gaode Maps will render here'
            : '高德地图渲染区域'}
        </Text>
      </View>

      {/* Route Stops */}
      <ScrollView contentContainerStyle={styles.stopsContainer}>
        <GradientButton
          title={isLoading ? '...' : todayRoute ? t('optimizeRoute') : t('startRoute')}
          onPress={optimizeRoute}
          disabled={isLoading}
          style={styles.startButton}
        />

        {error && (
          <Text style={styles.emptyText}>{error}</Text>
        )}

        {!isLoading && !error && waypoints.length === 0 && (
          <Text style={styles.emptyText}>
            {i18n.language === 'en'
              ? 'No route generated yet.'
              : '今日路线尚未生成。'}
          </Text>
        )}

        {waypoints.map((stop) => (
          <TouchableOpacity
            key={`${stop.store_id}-${stop.sequence}`}
            style={styles.stopItem}
            onPress={() => navigation.navigate('StoreDetail', { storeId: stop.store_id })}
          >
            <View
              style={[
                styles.stopNumber,
                stop.visited && styles.stopNumberVisited,
              ]}
            >
              <Text
                style={[
                  styles.stopNumberText,
                  stop.visited && styles.stopNumberTextVisited,
                ]}
              >
                {stop.sequence}
              </Text>
            </View>
            <View style={styles.stopContent}>
              <Text
                style={[
                  styles.stopName,
                  stop.visited && styles.stopNameVisited,
                ]}
              >
                {i18n.language === 'zh' ? stop.store_name_zh || stop.store_name : stop.store_name}
              </Text>
              <Text style={styles.stopMeta}>
                {stop.tier || '-'} {'\u00B7'} {new Date(stop.estimated_arrival).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            {stop.visited && (
              <Text style={styles.checkMark}>{'\u2713'}</Text>
            )}
          </TouchableOpacity>
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
  },
  meta: {
    color: '#60A5FA',
    fontSize: FontSize.md - 1,
    marginTop: 4,
  },
  mapPlaceholder: {
    height: 180,
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  stopsContainer: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  startButton: {
    marginBottom: Spacing.lg,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing.sm,
  },
  stopNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberVisited: {
    backgroundColor: Colors.success + '22',
  },
  stopNumberText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  stopNumberTextVisited: {
    color: Colors.success,
  },
  stopContent: {
    flex: 1,
  },
  stopName: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  stopNameVisited: {
    color: Colors.textSecondary,
  },
  stopMeta: {
    color: Colors.textDim,
    fontSize: FontSize.sm - 1,
    marginTop: 2,
  },
  checkMark: {
    color: Colors.success,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
