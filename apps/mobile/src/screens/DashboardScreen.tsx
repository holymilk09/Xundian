import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/useAuthStore';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { StoreCard } from '../components/StoreCard';
import { GradientButton } from '../components/GradientButton';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';
import { DEFAULT_SEARCH_RADIUS_KM } from '../utils/constants';
import type { StockStatus, Store } from '@xundian/shared';

interface RepAnalytics {
  visited_this_week: number;
  pending: number;
  overdue: number;
}

interface DashboardStore extends Store {
  last_visit_at?: string | null;
  last_stock_status?: StockStatus | null;
}

export function DashboardScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const employee = useAuthStore((s) => s.employee);
  const language = useAuthStore((s) => s.language);
  const setLanguage = useAuthStore((s) => s.setLanguage);

  const [searchRadius, setSearchRadius] = useState(DEFAULT_SEARCH_RADIUS_KM);
  const [analytics, setAnalytics] = useState<RepAnalytics | null>(null);
  const [stores, setStores] = useState<DashboardStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const toggleLang = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    Promise.all([
      api.get('/analytics/rep'),
      api.get('/stores', { params: { limit: 3 } }),
    ])
      .then(([analyticsResponse, storesResponse]) => {
        if (!mounted) return;
        setAnalytics(analyticsResponse.data.data);
        setStores(storesResponse.data.data || []);
      })
      .catch(() => {
        if (!mounted) return;
        setAnalytics(null);
        setStores([]);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const visited = analytics?.visited_this_week ?? 0;
  const pending = analytics?.pending ?? 0;
  const overdue = analytics?.overdue ?? 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.headerRow}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoChar}>{'\u5DE1'}</Text>
            </View>
            <Text style={styles.appName}>{t('appName')}</Text>
          </View>
          <Text style={styles.welcomeText}>
            {t('welcome')}, {employee?.name ?? ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.langToggle} onPress={toggleLang}>
          <Text style={styles.langToggleText}>{t('switchLang')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard label={t('visited')} value={String(visited)} color={Colors.success} />
          <StatCard label={t('pending')} value={String(pending)} color={Colors.primary} />
          <StatCard label={t('overdue')} value={String(overdue)} color={Colors.danger} />
          <StatCard label={t('stores')} value={String(stores.length)} color={Colors.purple} />
        </View>

        {/* Route Card */}
        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeTitle}>{t('todayRoute')}</Text>
            <Text style={styles.routeMeta}>
              {pending + overdue} {t('stores')}
            </Text>
          </View>
          <GradientButton title={t('startRoute')} onPress={() => navigation.navigate('Route')} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeInfoText}>{t('optimizeRoute')}</Text>
          </View>
        </View>

        {/* Nearby Search */}
        <View style={styles.nearbyCard}>
          <View style={styles.nearbyHeader}>
            <Text style={styles.nearbyTitle}>{t('nearbyStores')}</Text>
            <View style={styles.radiusRow}>
              <Text style={styles.radiusLabel}>{t('searchRadius')}:</Text>
              {[1, 2, 5].map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setSearchRadius(r)}
                  style={[
                    styles.radiusButton,
                    searchRadius === r && styles.radiusButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.radiusButtonText,
                      searchRadius === r && styles.radiusButtonTextActive,
                    ]}
                  >
                    {r}
                    {t('km')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.nearbyCount}>
            {i18n.language === 'en'
              ? `Search live stores within ${searchRadius}km`
              : `搜索${searchRadius}公里内门店`}
          </Text>
        </View>

        {/* Revisit Reminders */}
        <Text style={styles.sectionTitle}>{t('revisitReminders')}</Text>

        {isLoading && <Text style={styles.emptyText}>...</Text>}
        {!isLoading && stores.length === 0 && (
          <Text style={styles.emptyText}>
            {i18n.language === 'en'
              ? 'No pilot stores assigned yet.'
              : '暂无分配的试点门店。'}
          </Text>
        )}
        {stores.map((store) => {
          const lastVisitDays = store.last_visit_at
            ? Math.max(0, Math.floor((Date.now() - new Date(store.last_visit_at).getTime()) / 86400000))
            : null;
          return (
            <StoreCard
              key={store.id}
              store={store}
              visitStatus={store.last_stock_status ? 'visited' : 'pending'}
              lastVisitDays={lastVisitDays}
              onPress={() => navigation.navigate('StoreDetail', { storeId: store.id })}
            />
          );
        })}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoChar: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  welcomeText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
    marginLeft: 36,
  },
  langToggle: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 5,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  langToggleText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.xl,
  },
  routeCard: {
    padding: Spacing.xl - 2,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.15)',
    marginBottom: Spacing.xl,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  routeTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  routeMeta: {
    color: '#60A5FA',
    fontSize: FontSize.md - 1,
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  routeInfoText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  nearbyCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg + 2,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
  },
  nearbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nearbyTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  radiusLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  radiusButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  radiusButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radiusButtonText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  radiusButtonTextActive: {
    color: '#FFFFFF',
  },
  nearbyCount: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
