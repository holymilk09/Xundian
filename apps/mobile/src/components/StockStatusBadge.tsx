import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StockStatusColors, FontSize, BorderRadius } from '../theme';
import type { StockStatus } from '@xundian/shared';

interface StockStatusBadgeProps {
  status: StockStatus;
}

const STATUS_KEYS: Record<StockStatus, string> = {
  in_stock: 'inStock',
  low_stock: 'lowStock',
  out_of_stock: 'outOfStock',
  added_product: 'addedProduct',
};

export function StockStatusBadge({ status }: StockStatusBadgeProps) {
  const { t } = useTranslation();
  const color = StockStatusColors[status];

  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.text, { color }]}>{t(STATUS_KEYS[status])}</Text>
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
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
