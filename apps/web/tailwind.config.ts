import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        purple: {
          DEFAULT: '#8B5CF6',
          light: '#A78BFA',
        },
        background: '#0F172A',
        surface: {
          DEFAULT: 'rgba(255,255,255,0.04)',
          border: 'rgba(255,255,255,0.06)',
        },
        'tier-a': '#DC2626',
        'tier-b': '#F59E0B',
        'tier-c': '#6B7280',
        muted: '#64748B',
        dim: '#475569',
      },
      fontFamily: {
        sans: [
          'SF Pro Display',
          '-apple-system',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: ['SF Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
