'use client';

import { useTranslation } from 'react-i18next';
import TierBadge from '@/components/TierBadge';
import type { StoreTier } from '@xundian/shared';

// Mock data — would come from API in production
const mockStoreData: Record<string, {
  id: string;
  name: string;
  name_zh: string;
  tier: StoreTier;
  store_type: string;
  status: string;
  sos: number;
  facings: number;
  lastVisitDays: number | null;
  visits: Array<{ date: string; status: string; note: string; note_zh: string }>;
  aiAnalysis: {
    products: Array<{ name: string; name_zh: string; facings: number; status: string }>;
    competitors: string;
    competitors_zh: string;
  } | null;
}> = {
  '1': {
    id: '1', name: 'Yonghui Supermarket', name_zh: '永辉超市', tier: 'A',
    store_type: 'supermarket', status: 'visited', sos: 34, facings: 8, lastVisitDays: 2,
    visits: [
      { date: '2026-02-07', status: 'in_stock', note: 'All products stocked, good placement', note_zh: '产品齐全，摆放良好' },
      { date: '2026-01-28', status: 'low_stock', note: 'Oyster sauce running low, 2 bottles left', note_zh: '蚝油库存低，剩2瓶' },
      { date: '2026-01-18', status: 'added_product', note: 'Added dark soy sauce to shelf', note_zh: '已上架老抽' },
    ],
    aiAnalysis: {
      products: [
        { name: 'Haitian Soy Sauce (Light)', name_zh: '海天酱油(生抽)', facings: 6, status: 'good' },
        { name: 'Haitian Soy Sauce (Dark)', name_zh: '海天酱油(老抽)', facings: 2, status: 'ok' },
        { name: 'Haitian Oyster Sauce', name_zh: '海天蚝油', facings: 0, status: 'oos' },
      ],
      competitors: 'Lee Kum Kee (4 facings) / Chu Bang (3 facings) / Xin He (2 facings)',
      competitors_zh: '李锦记(4面) / 厨邦(3面) / 欣和(2面)',
    },
  },
};

// Default store for any ID not in mock data
const defaultStore = mockStoreData['1']!;

export default function StoreDetailPage({ params }: { params: { id: string } }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const store = mockStoreData[params.id] || defaultStore;

  const statusDotColor: Record<string, string> = {
    in_stock: 'bg-success',
    low_stock: 'bg-warning',
    out_of_stock: 'bg-danger',
    added_product: 'bg-purple',
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TierBadge tier={store.tier} />
          <span className="badge-pill text-success bg-success/15">{t(store.status)}</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          {lang === 'zh' ? store.name_zh : store.name}
        </h1>
        <p className="text-muted text-sm mt-1">
          {t(store.store_type)} &middot; ID #{store.id.padStart(5, '0')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: t('shelfShare'), value: `${store.sos}%`, color: store.sos > 25 ? 'text-success' : 'text-danger' },
          { label: t('facings'), value: String(store.facings), color: 'text-primary' },
          { label: t('lastVisit'), value: store.lastVisitDays !== null ? `${store.lastVisitDays} ${t('daysAgo')}` : '--', color: 'text-warning' },
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
            {store.visits.length === 0 ? (
              <p className="text-muted text-sm">{t('noVisits')}</p>
            ) : (
              store.visits.map((visit, i) => (
                <div key={i} className="glass-card p-3 flex gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusDotColor[visit.status] || 'bg-slate-500'}`} />
                  <div>
                    <div className="text-muted text-[11px]">{visit.date}</div>
                    <div className="text-slate-300 text-sm mt-0.5">
                      {lang === 'zh' ? visit.note_zh : visit.note}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Analysis */}
        <div>
          <h2 className="section-label mb-3">{t('aiAnalysis')}</h2>
          {store.aiAnalysis ? (
            <div className="glass-card p-4 space-y-3">
              {/* Share of shelf bar */}
              <div>
                <div className="section-label text-[10px] mb-2">{t('shelfShare')}</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${store.sos > 25 ? 'bg-gradient-to-r from-success to-emerald-400' : 'bg-gradient-to-r from-danger to-red-400'}`}
                      style={{ width: `${store.sos}%` }}
                    />
                  </div>
                  <span className="text-white font-bold text-sm">{store.sos}%</span>
                </div>
              </div>

              {/* Product breakdown */}
              <div className="space-y-0">
                {store.aiAnalysis.products.map((product, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0"
                  >
                    <span className="text-slate-300 text-sm">
                      {lang === 'zh' ? product.name_zh : product.name}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        product.status === 'good'
                          ? 'text-success'
                          : product.status === 'ok'
                            ? 'text-warning'
                            : 'text-danger'
                      }`}
                    >
                      {product.facings > 0 ? `${product.facings} ${t('facings')}` : t('outOfStock')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Competitors */}
              <div className="rounded-lg bg-danger/[0.06] p-3">
                <div className="text-red-400 text-xs font-semibold mb-1">
                  {i18n.language === 'zh' ? '发现竞品' : 'Competitors Detected'}
                </div>
                <div className="text-slate-400 text-xs">
                  {lang === 'zh' ? store.aiAnalysis.competitors_zh : store.aiAnalysis.competitors}
                </div>
              </div>

              <div className="text-dim text-[11px] text-right">
                {lang === 'en' ? 'Analyzed by Qwen2.5-VL / 0.87 confidence' : 'Qwen2.5-VL分析 / 置信度0.87'}
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
