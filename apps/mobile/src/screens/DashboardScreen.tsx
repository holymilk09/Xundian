import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/useAuthStore';
import { StatCard } from '../components/StatCard';
import { StoreCard } from '../components/StoreCard';
import { GradientButton } from '../components/GradientButton';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';
import { DEFAULT_SEARCH_RADIUS_KM } from '../utils/constants';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const employee = useAuthStore((s) => s.employee);
  const language = useAuthStore((s) => s.language);
  const setLanguage = useAuthStore((s) => s.setLanguage);

  const [searchRadius, setSearchRadius] = useState(DEFAULT_SEARCH_RADIUS_KM);

  const toggleLang = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

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
          <StatCard label={t('visited')} value="8" color={Colors.success} />
          <StatCard label={t('pending')} value="6" color={Colors.primary} />
          <StatCard label={t('overdue')} value="2" color={Colors.danger} />
          <StatCard label={t('discovered')} value="1" color={Colors.purple} />
        </View>

        {/* Route Card */}
        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeTitle}>{t('todayRoute')}</Text>
            <Text style={styles.routeMeta}>
              14 {t('stores')} {'\u00B7'} 12.4 {t('km')}
            </Text>
          </View>
          <GradientButton title={t('startRoute')} onPress={() => {}} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeInfoText}>~3.5h</Text>
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
              ? `Found 23 unvisited stores within ${searchRadius}km`
              : `${searchRadius}公里内发现23家未巡检门店`}
          </Text>
        </View>

        {/* Revisit Reminders */}
        <Text style={styles.sectionTitle}>{t('revisitReminders')}</Text>

        {/* Placeholder store list */}
        <StoreCard
          store={{
            id: '1',
            company_id: '',
            name: 'Yonghui Supermarket',
            name_zh: '永辉超市',
            latitude: 31.2304,
            longitude: 121.4737,
            tier: 'A',
            store_type: 'supermarket',
            created_at: '',
            updated_at: '',
          }}
          visitStatus="visited"
          lastVisitDays={2}
          onPress={() => navigation.navigate('StoreDetail', { storeId: '1' })}
        />
        <StoreCard
          store={{
            id: '2',
            company_id: '',
            name: 'FamilyMart #2891',
            name_zh: '全家便利店#2891',
            latitude: 31.2334,
            longitude: 121.4697,
            tier: 'B',
            store_type: 'convenience',
            created_at: '',
            updated_at: '',
          }}
          visitStatus="pending"
          lastVisitDays={8}
          onPress={() => navigation.navigate('StoreDetail', { storeId: '2' })}
        />
        <StoreCard
          store={{
            id: '3',
            company_id: '',
            name: "Uncle Wang's Shop",
            name_zh: '老王小卖部',
            latitude: 31.2284,
            longitude: 121.4777,
            tier: 'C',
            store_type: 'small_shop',
            created_at: '',
            updated_at: '',
          }}
          visitStatus="overdue"
          lastVisitDays={25}
          onPress={() => navigation.navigate('StoreDetail', { storeId: '3' })}
        />
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
});
