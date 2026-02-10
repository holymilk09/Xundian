'use client';

import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TeamMember {
  id: string;
  name: string;
  visits_this_week: number;
  unique_stores: number;
  avg_duration: number;
}

export default function TeamComparisonChart() {
  const { t } = useTranslation();
  const { data, loading } = useApi<TeamMember[]>('/analytics/team-comparison');

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px' }}>
        <p style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>{item.name}</p>
        <p style={{ color: '#FFFFFF', fontSize: 13 }}>
          {t('visits')}: {item.visits_this_week}
        </p>
        <p style={{ color: '#FFFFFF', fontSize: 13 }}>
          {t('uniqueStores')}: {item.unique_stores}
        </p>
        <p style={{ color: '#FFFFFF', fontSize: 13 }}>
          {t('avgDuration')}: {item.avg_duration} {t('min')}
        </p>
      </div>
    );
  };

  return (
    <div className="glass-card p-5">
      <div className="mb-4">
        <h3 className="text-white text-[15px] font-bold">{t('teamComparison')}</h3>
        <p className="text-slate-500 text-xs mt-1">{t('teamComparisonSubtitle')}</p>
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
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#94A3B8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar
              dataKey="visits_this_week"
              fill="#3B82F6"
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
