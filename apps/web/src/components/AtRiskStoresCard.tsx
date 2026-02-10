'use client';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import TierBadge from '@/components/TierBadge';
import { useApi } from '@/lib/hooks';
import type { StoreTier } from '@xundian/shared';

export default function AtRiskStoresCard() {
  const { t } = useTranslation();
  const { data: stores } = useApi<any[]>('/predictions/at-risk');

  const items = stores || [];

  return (
    <div className="rounded-xl p-5 bg-gradient-to-br from-[#8B5CF6]/10 to-[#7C3AED]/10 border border-[#8B5CF6]/15">
      <div className="flex items-center gap-2 mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="text-[#A78BFA] text-[15px] font-bold">{t('atRiskStores')}</span>
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item: any) => {
            const daysUntil = item.predicted_stockout_date
              ? Math.max(0, Math.ceil((new Date(item.predicted_stockout_date).getTime() - Date.now()) / 86400000))
              : null;
            const urgencyColor = daysUntil !== null && daysUntil <= 3
              ? 'text-danger'
              : daysUntil !== null && daysUntil <= 7
                ? 'text-warning'
                : 'text-success';

            return (
              <div
                key={item.id || item.store_id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/[0.05]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <TierBadge tier={(item.store_tier || 'C') as StoreTier} />
                  <Link
                    href={`/stores/${item.store_id}`}
                    className="text-white text-sm font-medium hover:text-[#8B5CF6] transition-colors truncate"
                  >
                    {item.store_name || '--'}
                  </Link>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-muted text-xs truncate max-w-[100px]">
                    {item.product_name || '--'}
                  </span>
                  {daysUntil !== null && (
                    <span className={`text-sm font-bold ${urgencyColor}`}>
                      {daysUntil}{t('daysUntilStockout')}
                    </span>
                  )}
                  <div className="w-16">
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#8B5CF6]"
                          style={{ width: `${Math.round((item.confidence || 0) * 100)}%` }}
                        />
                      </div>
                      <span className="text-muted text-[10px]">
                        {Math.round((item.confidence || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted text-sm text-center py-4">{t('noPredictions')}</p>
      )}
    </div>
  );
}
