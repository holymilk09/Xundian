'use client';

import { useTranslation } from 'react-i18next';
import TierBadge from '@/components/TierBadge';
import { useApi } from '@/lib/hooks';
import type { StoreTier } from '@xundian/shared';

export default function StoreDetailPage({ params }: { params: { id: string } }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const { data: store, loading, error } = useApi<any>(`/stores/${params.id}`);

  const statusDotColor: Record<string, string> = {
    in_stock: 'bg-success',
    low_stock: 'bg-warning',
    out_of_stock: 'bg-danger',
    added_product: 'bg-purple',
  };

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!store) return <p className="text-slate-400">Store not found</p>;

  const visits = store.recent_visits || [];
  const ai = store.latest_ai_analysis?.ai_analysis || null;
  const sos = ai?.share_of_shelf_percent || 0;
  const facings = ai?.our_products?.reduce((sum: number, p: any) => sum + (p.facing_count || 0), 0) || 0;
  const lastVisitDays = visits[0]?.checked_in_at
    ? Math.floor((Date.now() - new Date(visits[0].checked_in_at).getTime()) / 86400000)
    : null;

  const storeStatus = visits[0]?.stock_status || 'pending';

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TierBadge tier={store.tier as StoreTier} />
          <span className="badge-pill text-success bg-success/15">{t(storeStatus)}</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          {lang === 'zh' ? store.name_zh : store.name}
        </h1>
        <p className="text-muted text-sm mt-1">
          {t(store.store_type)} &middot; ID #{store.id.substring(0, 8)}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: t('shelfShare'), value: `${sos}%`, color: sos > 25 ? 'text-success' : 'text-danger' },
          { label: t('facings'), value: String(facings), color: 'text-primary' },
          { label: t('lastVisit'), value: lastVisitDays !== null ? `${lastVisitDays} ${t('daysAgo')}` : '--', color: 'text-warning' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-muted text-xs mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Visit History */}
        <div>
          <h2 className="section-label mb-3">{t('visitHistory')}</h2>
          <div className="space-y-2">
            {visits.length === 0 ? (
              <p className="text-muted text-sm">{t('noVisits')}</p>
            ) : (
              visits.map((visit: any, i: number) => (
                <div key={i} className="glass-card p-3 flex gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusDotColor[visit.stock_status] || 'bg-slate-500'}`} />
                  <div>
                    <div className="text-muted text-[11px]">
                      {new Date(visit.checked_in_at).toLocaleDateString()}
                      {visit.employee_name && ` — ${visit.employee_name}`}
                    </div>
                    <div className="text-slate-300 text-sm mt-0.5">
                      {visit.notes || t(visit.stock_status)}
                    </div>
                    {visit.duration_minutes && (
                      <div className="text-dim text-[11px] mt-0.5">
                        {visit.duration_minutes} min
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Analysis */}
        <div>
          <h2 className="section-label mb-3">{t('aiAnalysis')}</h2>
          {ai ? (
            <div className="glass-card p-4 space-y-3">
              {/* Share of shelf bar */}
              <div>
                <div className="section-label text-[10px] mb-2">{t('shelfShare')}</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sos > 25 ? 'bg-gradient-to-r from-success to-emerald-400' : 'bg-gradient-to-r from-danger to-red-400'}`}
                      style={{ width: `${sos}%` }}
                    />
                  </div>
                  <span className="text-white font-bold text-sm">{sos}%</span>
                </div>
              </div>

              {/* Product breakdown */}
              {ai.our_products && (
                <div className="space-y-0">
                  {ai.our_products.map((product: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0"
                    >
                      <span className="text-slate-300 text-sm">{product.name}</span>
                      <span
                        className={`text-sm font-semibold ${
                          product.stock_level === 'high'
                            ? 'text-success'
                            : product.stock_level === 'medium'
                              ? 'text-warning'
                              : 'text-danger'
                        }`}
                      >
                        {product.facing_count > 0 ? `${product.facing_count} ${t('facings')}` : t('outOfStock')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Competitors */}
              {ai.competitors && ai.competitors.length > 0 && (
                <div className="rounded-lg bg-danger/[0.06] p-3">
                  <div className="text-red-400 text-xs font-semibold mb-1">
                    {lang === 'zh' ? '发现竞品' : 'Competitors Detected'}
                  </div>
                  <div className="text-slate-400 text-xs">
                    {ai.competitors.map((c: any) => `${c.name} (${c.facing_count})`).join(' / ')}
                  </div>
                </div>
              )}

              <div className="text-dim text-[11px] text-right">
                {lang === 'en'
                  ? `Analyzed by Qwen2.5-VL / ${ai.confidence || '--'} confidence`
                  : `Qwen2.5-VL分析 / 置信度${ai.confidence || '--'}`}
              </div>
            </div>
          ) : (
            <div className="glass-card p-4 text-center text-muted text-sm">
              {lang === 'en' ? 'No AI analysis available' : '暂无AI分析'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
