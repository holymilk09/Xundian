'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';
import AIInsightsCard from '@/components/AIInsightsCard';

export default function AIInsightsPage() {
  const { t } = useTranslation();
  const { data: analytics } = useApi<any>('/analytics/ai');
  const { data: aiStats } = useApi<any>('/ai/stats');
  const [processing, setProcessing] = useState(false);

  const handleProcessAll = async () => {
    setProcessing(true);
    try {
      await api.post('/ai/process-batch');
    } catch {
      // ignore
    } finally {
      setProcessing(false);
    }
  };

  const chartData = aiStats?.processing_by_day || [];
  const recentAnalyses = aiStats?.recent_analyses || [];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{t('aiInsightsPage')}</h1>
        <button
          onClick={handleProcessAll}
          disabled={processing}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {processing ? t('processing') : t('processAll')}
        </button>
      </div>

      {/* Stats Card */}
      <div className="mb-6">
        <AIInsightsCard
          photosProcessed={String(analytics?.photos_processed ?? '--')}
          alertsGenerated={String(analytics?.alerts_generated ?? '--')}
          avgShareOfShelf={analytics?.avg_share_of_shelf != null ? `${Math.round(analytics.avg_share_of_shelf)}%` : '--'}
        />
      </div>

      {/* Processing Trends Chart */}
      <div className="glass-card p-5 mb-6">
        <h2 className="section-label mb-4">{t('processingTrends')}</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <XAxis
                dataKey="date"
                stroke="#475569"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                stroke="#475569"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#F8FAFC',
                }}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Bar
                dataKey="count"
                name={t('photosPerDay')}
                fill="#8B5CF6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted text-sm text-center py-8">{t('noAnalyses')}</p>
        )}
      </div>

      {/* Recent Analyses */}
      <div className="glass-card p-5">
        <h2 className="section-label mb-4">{t('recentAnalyses')}</h2>
        {recentAnalyses.length > 0 ? (
          <div className="space-y-2">
            {recentAnalyses.map((item: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 px-3 rounded-lg bg-white/[0.03] border border-white/[0.04]"
              >
                <div>
                  <div className="text-white text-sm font-medium">{item.store_name || '--'}</div>
                  <div className="text-muted text-[11px] mt-0.5">
                    {item.ai_processed_at
                      ? new Date(item.ai_processed_at).toLocaleDateString()
                      : '--'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[#8B5CF6] text-sm font-bold">
                      {item.ai_analysis?.share_of_shelf_percent != null
                        ? `${item.ai_analysis.share_of_shelf_percent}%`
                        : '--'}
                    </div>
                    <div className="text-muted text-[10px]">{t('shelfShare')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-300 text-sm font-bold">
                      {item.ai_analysis?.confidence != null
                        ? `${Math.round(item.ai_analysis.confidence * 100)}%`
                        : '--'}
                    </div>
                    <div className="text-muted text-[10px]">{t('confidence')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm text-center py-8">{t('noAnalyses')}</p>
        )}
      </div>
    </div>
  );
}
