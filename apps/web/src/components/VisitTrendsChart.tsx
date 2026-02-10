'use client';

import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendDataPoint {
  date: string;
  visits: number;
}

export default function VisitTrendsChart() {
  const { t } = useTranslation();
  const { data, loading } = useApi<TrendDataPoint[]>('/analytics/visit-trends');

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-5">
      <div className="mb-4">
        <h3 className="text-white text-[15px] font-bold">{t('visitTrends')}</h3>
        <p className="text-slate-500 text-xs mt-1">{t('visitTrendsSubtitle')}</p>
      </div>

      {loading && (
        <div className="h-[250px] flex items-center justify-center">
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      )}

      {!loading && (!data || data.length === 0) && (
        <div className="h-[250px] flex items-center justify-center">
          <p className="text-slate-500 text-sm">No data available</p>
        </div>
      )}

      {!loading && data && data.length > 0 && (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="visitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              labelStyle={{ color: '#94A3B8' }}
              itemStyle={{ color: '#FFFFFF' }}
              labelFormatter={formatDate}
              formatter={(value: number) => [value, t('visits')]}
            />
            <Area
              type="monotone"
              dataKey="visits"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#visitGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
