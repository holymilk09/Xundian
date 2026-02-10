'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TierCoverage {
  total: number;
  covered: number;
  rate: number;
}

interface CoverageData {
  A: TierCoverage;
  B: TierCoverage;
  C: TierCoverage;
  overall: TierCoverage;
}

const tierColors: Record<string, string> = {
  A: '#DC2626',
  B: '#F59E0B',
  C: '#6B7280',
  Overall: '#3B82F6',
};

export default function CoverageChart() {
  const { t } = useTranslation();
  const { data, loading } = useApi<CoverageData>('/analytics/coverage');

  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { tier: 'A', rate: data.A.rate, total: data.A.total, covered: data.A.covered, fill: tierColors.A },
      { tier: 'B', rate: data.B.rate, total: data.B.total, covered: data.B.covered, fill: tierColors.B },
      { tier: 'C', rate: data.C.rate, total: data.C.total, covered: data.C.covered, fill: tierColors.C },
      { tier: t('overall'), rate: data.overall.rate, total: data.overall.total, covered: data.overall.covered, fill: tierColors.Overall },
    ];
  }, [data, t]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px' }}>
        <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>{item.tier}</p>
        <p style={{ color: '#FFFFFF', fontSize: 13 }}>
          {t('covered')}: {item.covered} / {item.total}
        </p>
        <p style={{ color: '#FFFFFF', fontSize: 13 }}>
          {t('rate')}: {item.rate}%
        </p>
      </div>
    );
  };

  return (
    <div className="glass-card p-5">
      <div className="mb-4">
        <h3 className="text-white text-[15px] font-bold">{t('coverageRate')}</h3>
        <p className="text-slate-500 text-xs mt-1">{t('coverageSubtitle')}</p>
      </div>

      {loading && (
        <div className="h-[250px] flex items-center justify-center">
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      )}

      {!loading && !data && (
        <div className="h-[250px] flex items-center justify-center">
          <p className="text-slate-500 text-sm">No data available</p>
        </div>
      )}

      {!loading && data && (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <XAxis
              dataKey="tier"
              tick={{ fill: '#94A3B8', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
