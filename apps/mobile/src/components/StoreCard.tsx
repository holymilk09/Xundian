import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TierBadge } from './TierBadge';
import {
  Colors,
  VisitStatusColors,
  FontSize,
  BorderRadius,
  Spacing,
} from '../theme';
import type { Store } from '@xundian/shared';

interface StoreCardProps {
  store: Store;
  visitStatus?: 'visited' | 'pending' | 'overdue' | 'discovered';
  lastVisitDays?: number | null;
  onPress: () => void;
}

const STORE_TYPE_ICON: Record<string, string> = {
  supermarket: '🏬',
  convenience: '🏪',
  small_shop: '🏠',
  other: '🏢',
};

export function StoreCard({
  store,
  visitStatus = 'pending',
  lastVisitDays,
  onPress,
}: StoreCardProps) {
  const { t, i18n } = useTranslation();
  const statusColor = VisitStatusColors[visitStatus] ?? Colors.textMuted;
  const icon = STORE_TYPE_ICON[store.store_type] ?? '🏢';
  const displayName =
    i18n.language === 'zh' && store.name_zh ? store.name_zh : store.name;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.container}
    >
      <View style={[styles.icon, { backgroundColor: statusColor + '15' }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <TierBadge tier={store.tier} />
        </View>
        <View style={styles.bottomRow}>
          <Text style={[styles.status, { color: statusColor }]}>
            {t(visitStatus)}
          </Text>
          <Text style={styles.lastVisit}>
            {lastVisitDays != null
              ? `${lastVisitDays} ${t('daysAgo')}`
              : '\u2014'}
          </Text>
        </View>
      </View>
      <Text style={styles.chevron}>{'\u203A'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing.sm,
    gap: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  status: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  lastVisit: {
    color: Colors.textDim,
    fontSize: FontSize.sm - 1,
  },
  chevron: {
    color: Colors.textSubtle,
    fontSize: 18,
  },
});
