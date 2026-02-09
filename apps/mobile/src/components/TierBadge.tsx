import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TierColors, FontSize, BorderRadius } from '../theme';
import type { StoreTier } from '@xundian/shared';

interface TierBadgeProps {
  tier: StoreTier;
}

export function TierBadge({ tier }: TierBadgeProps) {
  const color = TierColors[tier];

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{tier}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  text: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
