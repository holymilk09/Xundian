'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StoreTable from '@/components/StoreTable';
import { useApi, useExportCSV } from '@/lib/hooks';
import { getUser, isManagerRole } from '@/lib/auth';
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
  const user = getUser();
  const isManager = isManagerRole(user);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<StoreTier | ''>('');
  const [typeFilter, setTypeFilter] = useState<StoreType | ''>('');
  const storesUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (search.trim()) params.set('search', search.trim());
    if (tierFilter) params.set('tier', tierFilter);
    if (typeFilter) params.set('store_type', typeFilter);
    return `/stores?${params.toString()}`;
  }, [search, tierFilter, typeFilter]);

  const { data, loading, error } = useApi<any[]>(storesUrl);
  const { exporting, handleExport } = useExportCSV(
    '/export/stores',
    `stores-${new Date().toISOString().split('T')[0]}.csv`,
  );

  const stores = (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    name_zh: item.name_zh,
    address: item.address,
    gaode_poi_id: item.gaode_poi_id,
    tier: item.tier as StoreTier,
    store_type: item.store_type as StoreType,
    status: item.last_stock_status || 'pending',
    lastVisit: formatLastVisit(item.last_visit_at),
    lastVisitAt: item.last_visit_at,
    sos: item.latest_share_of_shelf_percent ?? null,
  }));

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{t('stores')}</h1>
        <div className="flex gap-3">
          {isManager && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 rounded-lg bg-white/[0.06] text-slate-300 text-sm font-medium hover:bg-white/[0.1] transition-colors disabled:opacity-50"
            >
              {exporting ? t('exporting') : t('exportStores')}
            </button>
          )}
          <Link
            href="/stores/discover"
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + {t('addStore')}
          </Link>
          {isManager && (
            <Link
              href="/stores/pending"
              className="px-4 py-2 rounded-lg border border-warning/30 text-warning text-sm font-medium hover:bg-warning/10 transition-colors"
            >
              {t('pendingApprovals')}
            </Link>
          )}
        </div>
      </div>
      {loading && <p className="text-slate-400">Loading...</p>}
      {error && <p className="text-danger">{error}</p>}
      {!loading && !error && (
        <StoreTable
          stores={stores}
          search={search}
          onSearchChange={setSearch}
          tierFilter={tierFilter}
          onTierFilterChange={setTierFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />
      )}
    </div>
  );
}
