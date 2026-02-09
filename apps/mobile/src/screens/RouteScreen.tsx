import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GradientButton } from '../components/GradientButton';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';

interface RouteStop {
  sequence: number;
  name: string;
  nameZh: string;
  tier: string;
  visited: boolean;
  estimatedTime: string;
}

const MOCK_STOPS: RouteStop[] = [
  { sequence: 1, name: 'Yonghui Supermarket', nameZh: '永辉超市', tier: 'A', visited: true, estimatedTime: '09:00' },
  { sequence: 2, name: 'FamilyMart #2891', nameZh: '全家便利店#2891', tier: 'B', visited: true, estimatedTime: '09:35' },
  { sequence: 3, name: 'Carrefour Central', nameZh: '家乐福中心店', tier: 'A', visited: false, estimatedTime: '10:15' },
  { sequence: 4, name: 'Lawson Nanjing Rd', nameZh: '罗森南京路店', tier: 'B', visited: false, estimatedTime: '10:50' },
  { sequence: 5, name: "Uncle Wang's Shop", nameZh: '老王小卖部', tier: 'C', visited: false, estimatedTime: '11:20' },
];

export function RouteScreen() {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('todayRoute')}</Text>
        <Text style={styles.meta}>
          {MOCK_STOPS.length} {t('stores')} {'\u00B7'} 12.4 {t('km')}
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
          title={t('startRoute')}
          onPress={() => {}}
          style={styles.startButton}
        />

        {MOCK_STOPS.map((stop) => (
          <View key={stop.sequence} style={styles.stopItem}>
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
                {i18n.language === 'zh' ? stop.nameZh : stop.name}
              </Text>
              <Text style={styles.stopMeta}>
                {stop.tier} {'\u00B7'} {stop.estimatedTime}
              </Text>
            </View>
            {stop.visited && (
              <Text style={styles.checkMark}>{'\u2713'}</Text>
            )}
          </View>
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
