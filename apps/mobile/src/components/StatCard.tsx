import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
}

export function StatCard({ label, value, color }: StatCardProps) {
  return (
    <View style={[styles.card, { borderColor: color + '22' }]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  label: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
