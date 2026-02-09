import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StoreCard } from '../components/StoreCard';
import { Colors, FontSize, BorderRadius, Spacing } from '../theme';
import { DEFAULT_SEARCH_RADIUS_KM } from '../utils/constants';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function NearbyScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const [radius, setRadius] = useState(DEFAULT_SEARCH_RADIUS_KM);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('nearbyStores')}</Text>
        <View style={styles.radiusRow}>
          {[1, 2, 5].map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRadius(r)}
              style={[
                styles.radiusButton,
                radius === r && styles.radiusButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.radiusText,
                  radius === r && styles.radiusTextActive,
                ]}
              >
                {r}{t('km')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.resultText}>
          {i18n.language === 'en'
            ? `Found 23 unvisited stores within ${radius}km`
            : `${radius}公里内发现23家未巡检门店`}
        </Text>

        <StoreCard
          store={{
            id: '6',
            company_id: '',
            name: 'Auntie Li Grocery',
            name_zh: '李阿姨杂货店',
            latitude: 31.2274,
            longitude: 121.4717,
            tier: 'C',
            store_type: 'small_shop',
            created_at: '',
            updated_at: '',
          }}
          visitStatus="discovered"
          lastVisitDays={null}
          onPress={() => navigation.navigate('StoreDetail', { storeId: '6' })}
        />
        <StoreCard
          store={{
            id: '4',
            company_id: '',
            name: 'Carrefour Central',
            name_zh: '家乐福中心店',
            latitude: 31.2354,
            longitude: 121.4817,
            tier: 'A',
            store_type: 'supermarket',
            created_at: '',
            updated_at: '',
          }}
          visitStatus="pending"
          lastVisitDays={3}
          onPress={() => navigation.navigate('StoreDetail', { storeId: '4' })}
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
    marginBottom: Spacing.md,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  radiusButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  radiusButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radiusText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  radiusTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  resultText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
  },
});
