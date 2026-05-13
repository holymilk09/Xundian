import React, { useEffect, useMemo, useState } from 'react';
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
import { api } from '../services/api';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { StockStatus, StoreTier, StoreType } from '@xundian/shared';

type DetailRouteProp = RouteProp<RootStackParamList, 'StoreDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface StoreDetail {
  id: string;
  name: string;
  name_zh?: string | null;
  tier: StoreTier;
  store_type: StoreType;
  last_visit?: { checked_in_at: string; stock_status: StockStatus; notes?: string | null } | null;
  recent_visits?: Array<{ checked_in_at: string; stock_status: StockStatus; notes?: string | null }>;
  latest_ai_analysis?: {
    ai_analysis?: {
      our_products?: Array<{ facing_count?: number }>;
      share_of_shelf_percent?: number;
      competitors?: Array<{ name: string; facing_count?: number }>;
      confidence?: number;
    } | null;
  } | null;
}

export function StoreDetailScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<DetailRouteProp>();
  const { storeId } = route.params;

  const [showAI, setShowAI] = useState(false);
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    api.get(`/stores/${storeId}`)
      .then((response) => {
        if (mounted) setStore(response.data.data);
      })
      .catch(() => {
        if (mounted) setStore(null);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [storeId]);

  const aiAnalysis = store?.latest_ai_analysis?.ai_analysis ?? null;
  const sos = Math.round(aiAnalysis?.share_of_shelf_percent ?? 0);
  const facings = useMemo(
    () => (aiAnalysis?.our_products || []).reduce((total, product) => total + (product.facing_count || 0), 0),
    [aiAnalysis],
  );
  const lastVisitDays = store?.last_visit?.checked_in_at
    ? Math.max(0, Math.floor((Date.now() - new Date(store.last_visit.checked_in_at).getTime()) / 86400000))
    : null;

  const displayName =
    i18n.language === 'zh' && store?.name_zh ? store.name_zh : store?.name || storeId;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <View style={styles.badges}>
                {store?.tier && <TierBadge tier={store.tier} />}
                <StockStatusBadge status={store?.last_visit?.stock_status || 'in_stock'} />
              </View>
              <Text style={styles.storeName}>{displayName}</Text>
              <Text style={styles.storeMeta}>
                {store ? t(store.store_type) : isLoading ? '...' : i18n.language === 'en' ? 'Store unavailable' : '门店暂不可用'} {'\u00B7'} ID #
                {storeId.slice(0, 8)}
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
                { color: sos > 25 ? Colors.success : Colors.danger },
              ]}
            >
              {sos || '--'}{sos ? '%' : ''}
            </Text>
            <Text style={styles.statLabel}>{t('shelfShare')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {facings || '--'}
            </Text>
            <Text style={styles.statLabel}>{t('facings')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>
              {lastVisitDays ?? '--'}
              {lastVisitDays != null ? i18n.language === 'en' ? 'd' : '\u5929' : ''}
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
                      width: `${sos}%`,
                      backgroundColor:
                        sos > 25 ? Colors.success : Colors.danger,
                    },
                  ]}
                />
              </View>
              <Text style={styles.sosValue}>{sos || '--'}{sos ? '%' : ''}</Text>
            </View>

            {/* Competitors */}
            <View style={styles.competitorBox}>
              <Text style={styles.competitorTitle}>{t('competitors')}</Text>
              <Text style={styles.competitorDetail}>
                {(aiAnalysis?.competitors || [])
                  .map((competitor) => `${competitor.name}${competitor.facing_count ? ` (${competitor.facing_count})` : ''}`)
                  .join(' \u00B7 ') || '--'}
              </Text>
            </View>

            <Text style={styles.aiFooter}>
              {aiAnalysis?.confidence != null
                ? `${i18n.language === 'en' ? 'Analyzed by Qwen2.5-VL' : 'Qwen2.5-VL分析'} \u00B7 ${aiAnalysis.confidence} confidence`
                : '--'}
            </Text>
          </View>
        )}

        {/* Visit Timeline */}
        <View style={styles.timelineSection}>
          <VisitTimeline
            visits={(store?.recent_visits || []).map((visit) => ({
              date: visit.checked_in_at.slice(0, 10),
              stockStatus: visit.stock_status,
              note: visit.notes || '',
            }))}
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
