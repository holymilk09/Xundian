export const COLORS = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  background: '#0F172A',
  surface: 'rgba(255,255,255,0.04)',
  surfaceBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDim: '#475569',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const BORDER_RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
} as const;

export const FONT_FAMILY = {
  primary: "'SF Pro Display', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  mono: "'SF Mono', Menlo, monospace",
} as const;

export const FONT_SIZE = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
} as const;

export const GPS_CONFIG = {
  ACCURACY_THRESHOLD_M: 50,
  GEOFENCE_RADIUS_M: 200,
  TIMESTAMP_DRIFT_TOLERANCE_MS: 5 * 60 * 1000,
} as const;

export const PHOTO_CONFIG = {
  MAX_SIZE_MB: 5,
  COMPRESSION_QUALITY: 0.8,
} as const;

export const DEFAULT_SEARCH_RADIUS_KM = 2;
