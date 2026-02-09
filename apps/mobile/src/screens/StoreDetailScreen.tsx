import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TierBadge } from '../components/TierBadge';
import { StockStatusBadge } from '../components/StockStatusBadge';
import { GradientButton } from '../components/GradientButton';
import { VisitTimeline } from '../components/VisitTimeline';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

type DetailRouteProp = RouteProp<RootStackParamList, 'StoreDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function StoreDetailScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<DetailRouteProp>();
  const { storeId } = route.params;

  const [showAI, setShowAI] = useState(false);

  // Placeholder data -- in production, fetch from WatermelonDB by storeId
  const store = {
    id: storeId,
    name: 'Yonghui Supermarket',
    name_zh: '永辉超市',
    tier: 'A' as const,
    store_type: 'supermarket' as const,
    sos: 34,
    facings: 8,
    lastVisitDays: 2,
    status: 'visited' as const,
  };

  const displayName =
    i18n.language === 'zh' && store.name_zh ? store.name_zh : store.name;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <View style={styles.badges}>
                <TierBadge tier={store.tier} />
                <StockStatusBadge status="in_stock" />
              </View>
              <Text style={styles.storeName}>{displayName}</Text>
              <Text style={styles.storeMeta}>
                {t(store.store_type)} {'\u00B7'} ID #
                {store.id.toString().padStart(5, '0')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.closeText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text
              style={[
                styles.statValue,
                { color: store.sos > 25 ? Colors.success : Colors.danger },
              ]}
            >
              {store.sos}%
            </Text>
            <Text style={styles.statLabel}>{t('shelfShare')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {store.facings}
            </Text>
            <Text style={styles.statLabel}>{t('facings')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>
              {store.lastVisitDays}
              {i18n.language === 'en' ? 'd' : '\u5929'}
            </Text>
            <Text style={styles.statLabel}>{t('lastVisit')}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <GradientButton
            title={t('checkIn')}
            onPress={() => navigation.navigate('CheckIn', { storeId })}
            colorFrom={Colors.success}
            style={styles.actionButton}
          />
          <GradientButton
            title={t('takePhoto')}
            onPress={() => navigation.navigate('Camera', { storeId })}
            style={styles.actionButton}
          />
        </View>

        {/* AI Analysis Toggle */}
        <TouchableOpacity
          style={styles.aiToggle}
          onPress={() => setShowAI(!showAI)}
        >
          <Text style={styles.aiToggleText}>{t('aiAnalysis')}</Text>
          <Text style={styles.aiChevron}>{showAI ? '\u25BE' : '\u25B8'}</Text>
        </TouchableOpacity>

        {showAI && (
          <View style={styles.aiPanel}>
            {/* Share of shelf bar */}
            <Text style={styles.aiSectionLabel}>{t('shelfShare')}</Text>
            <View style={styles.sosBarContainer}>
              <View style={styles.sosBarBg}>
                <View
                  style={[
                    styles.sosBarFill,
                    {
                      width: `${store.sos}%`,
                      backgroundColor:
                        store.sos > 25 ? Colors.success : Colors.danger,
                    },
                  ]}
                />
              </View>
              <Text style={styles.sosValue}>{store.sos}%</Text>
            </View>

            {/* Competitors */}
            <View style={styles.competitorBox}>
              <Text style={styles.competitorTitle}>{t('competitors')}</Text>
              <Text style={styles.competitorDetail}>
                {i18n.language === 'en'
                  ? 'Lee Kum Kee (4 facings) \u00B7 Chu Bang (3 facings)'
                  : '李锦记(4面) \u00B7 厨邦(3面)'}
              </Text>
            </View>

            <Text style={styles.aiFooter}>
              {i18n.language === 'en'
                ? 'Analyzed by Qwen2.5-VL \u00B7 0.87 confidence'
                : 'Qwen2.5-VL分析 \u00B7 置信度0.87'}
            </Text>
          </View>
        )}

        {/* Visit Timeline */}
        <View style={styles.timelineSection}>
          <VisitTimeline
            visits={[
              {
                date: '2026-02-07',
                stockStatus: 'in_stock',
                note:
                  i18n.language === 'en'
                    ? 'All products stocked, good placement'
                    : '产品齐全，摆放良好',
              },
              {
                date: '2026-01-28',
                stockStatus: 'low_stock',
                note:
                  i18n.language === 'en'
                    ? 'Oyster sauce running low, 2 bottles left'
                    : '蚝油库存低，剩2瓶',
              },
              {
                date: '2026-01-18',
                stockStatus: 'added_product',
                note:
                  i18n.language === 'en'
                    ? 'Added dark soy sauce to shelf'
                    : '已上架老抽',
              },
            ]}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: Spacing.xxxl,
  },
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: 56,
    paddingBottom: Spacing.lg,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  storeName: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl + 2,
    fontWeight: '700',
  },
  storeMeta: {
    color: Colors.textMuted,
    fontSize: FontSize.md - 1,
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  statBox: {
    flex: 1,
    padding: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm - 1,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  aiToggle: {
    marginHorizontal: Spacing.xxl,
    padding: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiToggleText: {
    color: '#A78BFA',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  aiChevron: {
    color: Colors.textMuted,
    fontSize: FontSize.xl,
  },
  aiPanel: {
    marginHorizontal: Spacing.xxl,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  aiSectionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm - 1,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  sosBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sosBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  sosBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sosValue: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '700',
    minWidth: 45,
    textAlign: 'right',
  },
  competitorBox: {
    padding: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(239,68,68,0.06)',
    marginBottom: Spacing.md,
  },
  competitorTitle: {
    color: '#F87171',
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: 4,
  },
  competitorDetail: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  aiFooter: {
    color: Colors.textDim,
    fontSize: FontSize.sm - 1,
    textAlign: 'right',
  },
  timelineSection: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
  },
});
