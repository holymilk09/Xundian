import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';
import { api } from '../services/api';

interface AlertItem {
  id: string;
  store_id: string;
  store_name: string;
  store_name_zh?: string;
  next_visit_date: string;
  priority: 'high' | 'normal' | 'low';
  reason: string;
}

const SEVERITY_COLORS = {
  high: Colors.danger,
  normal: Colors.warning,
  low: Colors.primary,
};

export function AlertsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError('');
    api.get('/alerts')
      .then((response) => {
        if (mounted) setAlerts(response.data.data || []);
      })
      .catch((err) => {
        if (!mounted) return;
        setAlerts([]);
        setError(err instanceof Error ? err.message : 'Unable to load alerts.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('alerts')}</Text>
        <Text style={styles.count}>
          {alerts.length} {i18n.language === 'en' ? 'active' : '条'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading && <Text style={styles.emptyText}>...</Text>}
        {error ? <Text style={styles.emptyText}>{error}</Text> : null}
        {!isLoading && !error && alerts.length === 0 && (
          <Text style={styles.emptyText}>
            {i18n.language === 'en' ? 'No active alerts.' : '暂无待处理提醒。'}
          </Text>
        )}
        {alerts.map((alert) => {
          const color = SEVERITY_COLORS[alert.priority] || Colors.primary;
          const storeName = i18n.language === 'zh' && alert.store_name_zh
            ? alert.store_name_zh
            : alert.store_name;
          return (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertCard}
              onPress={() => navigation.navigate('StoreDetail', { storeId: alert.store_id })}
            >
              <View style={[styles.severityDot, { backgroundColor: color }]} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>
                  {storeName}
                </Text>
                <Text style={styles.alertDesc}>
                  {alert.reason} {'\u00B7'} {alert.next_visit_date}
                </Text>
              </View>
            </TouchableOpacity>
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
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
