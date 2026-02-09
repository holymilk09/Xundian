import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, StockStatusColors, FontSize, BorderRadius, Spacing } from '../theme';
import { formatDate } from '../utils/format';
import type { StockStatus } from '@xundian/shared';

interface VisitEntry {
  date: string;
  stockStatus: StockStatus;
  note?: string;
}

interface VisitTimelineProps {
  visits: VisitEntry[];
}

export function VisitTimeline({ visits }: VisitTimelineProps) {
  const { t } = useTranslation();

  return (
    <View>
      <Text style={styles.header}>{t('visitHistory')}</Text>
      {visits.map((visit, index) => {
        const dotColor = StockStatusColors[visit.stockStatus] ?? Colors.textMuted;
        return (
          <View key={index} style={styles.entry}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <View style={styles.entryContent}>
              <Text style={styles.date}>
                {formatDate(visit.date)}
              </Text>
              {visit.note ? (
                <Text style={styles.note}>{visit.note}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  entry: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md + 2,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  entryContent: {
    flex: 1,
  },
  date: {
    color: Colors.textMuted,
    fontSize: FontSize.sm - 1,
  },
  note: {
    color: '#CBD5E1',
    fontSize: FontSize.md - 1,
    marginTop: 2,
  },
});
