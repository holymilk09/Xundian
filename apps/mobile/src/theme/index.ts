import { Platform } from 'react-native';

export const Colors = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  success: '#10B981',
  successDark: '#059669',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  surface: 'rgba(255,255,255,0.04)',
  surfaceBorder: 'rgba(255,255,255,0.06)',
  surfaceBorderLight: 'rgba(255,255,255,0.08)',
  surfaceBorderMedium: 'rgba(255,255,255,0.10)',
  surfaceBorderStrong: 'rgba(255,255,255,0.12)',
  surfaceLight: 'rgba(255,255,255,0.05)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDim: '#475569',
  textSubtle: '#334155',
} as const;

export const TierColors = {
  A: '#DC2626',
  B: '#F59E0B',
  C: '#6B7280',
} as const;

export const StockStatusColors = {
  in_stock: '#10B981',
  low_stock: '#F59E0B',
  out_of_stock: '#EF4444',
  added_product: '#8B5CF6',
} as const;

export const VisitStatusColors = {
  visited: '#10B981',
  pending: '#3B82F6',
  overdue: '#EF4444',
  discovered: '#8B5CF6',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
} as const;

export const FontFamily = {
  primary: Platform.select({
    ios: 'SF Pro Display',
    android: 'sans-serif',
    default: 'System',
  }),
  primaryCN: Platform.select({
    ios: 'PingFang SC',
    android: 'sans-serif',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'SF Mono',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;
