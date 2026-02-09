import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';

interface AlertItem {
  id: string;
  type: 'oos' | 'overdue' | 'reminder';
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  severity: 'high' | 'medium' | 'low';
}

const MOCK_ALERTS: AlertItem[] = [
  {
    id: '1',
    type: 'oos',
    title: 'Out-of-Stock: Oyster Sauce at Yonghui',
    titleZh: '缺货预警：永辉超市蚝油',
    description: 'Predicted stockout in 3 days. Recommend priority revisit.',
    descriptionZh: '预计3天内缺货。建议优先复访。',
    severity: 'high',
  },
  {
    id: '2',
    type: 'overdue',
    title: "Uncle Wang's Shop overdue by 4 days",
    titleZh: '老王小卖部逾期4天',
    description: 'Last visited 25 days ago. Tier C revisit window exceeded.',
    descriptionZh: '上次巡检25天前。C级门店复访周期已超。',
    severity: 'medium',
  },
  {
    id: '3',
    type: 'reminder',
    title: 'FamilyMart #2891 due today',
    titleZh: '全家便利店#2891今日到期',
    description: 'Scheduled revisit for today. Tier B 14-day cycle.',
    descriptionZh: '今日计划复访。B级门店14天周期。',
    severity: 'low',
  },
];

const SEVERITY_COLORS = {
  high: Colors.danger,
  medium: Colors.warning,
  low: Colors.primary,
};

export function AlertsScreen() {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('alerts')}</Text>
        <Text style={styles.count}>
          {MOCK_ALERTS.length} {i18n.language === 'en' ? 'active' : '条'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {MOCK_ALERTS.map((alert) => {
          const color = SEVERITY_COLORS[alert.severity];
          return (
            <View key={alert.id} style={styles.alertCard}>
              <View style={[styles.severityDot, { backgroundColor: color }]} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>
                  {i18n.language === 'zh' ? alert.titleZh : alert.title}
                </Text>
                <Text style={styles.alertDesc}>
                  {i18n.language === 'zh'
                    ? alert.descriptionZh
                    : alert.description}
                </Text>
              </View>
            </View>
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
    alignItems: 'center',
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
  count: {
    color: Colors.textMuted,
    fontSize: FontSize.md - 1,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  alertCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: Spacing.sm,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertDesc: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
});
