import type { StoreTier } from '../types/store';
import type { TierConfig } from '../types/company';

export const TIER_COLORS: Record<StoreTier, string> = {
  A: '#DC2626',
  B: '#F59E0B',
  C: '#6B7280',
};

export const TIER_LABELS: Record<StoreTier, { en: string; zh: string }> = {
  A: { en: 'Hypermarket', zh: '大型超市' },
  B: { en: 'Convenience', zh: '便利店' },
  C: { en: 'Small Shop', zh: '小店' },
};

export const DEFAULT_TIER_CONFIG: TierConfig = {
  A: { revisit_days: 7 },
  B: { revisit_days: 14 },
  C: { revisit_days: 30 },
};
