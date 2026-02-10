'use client';

import { useTranslation } from 'react-i18next';
import StoreTable from '@/components/StoreTable';
import { useApi } from '@/lib/hooks';
import type { StoreTier, StoreType } from '@xundian/shared';

function formatLastVisit(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function StoresPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useApi<any[]>('/stores?limit=100');

  const stores = (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    name_zh: item.name_zh,
    tier: item.tier as StoreTier,
    store_type: item.store_type as StoreType,
    status: item.last_stock_status || 'pending',
    lastVisit: formatLastVisit(item.last_visit_at),
    sos: 0,
  }));

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-white mb-6">{t('stores')}</h1>
      {loading && <p className="text-slate-400">Loading...</p>}
      {error && <p className="text-danger">{error}</p>}
      {!loading && !error && <StoreTable stores={stores} />}
    </div>
  );
}
