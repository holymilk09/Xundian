'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import StoreTable from '@/components/StoreTable';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
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
  const isManager = user?.role !== 'rep';
  const { data, loading, error } = useApi<any[]>('/stores?limit=100');
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await api.get('/export/stores', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stores-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert(t('operationFailed'));
    } finally {
      setExporting(false);
    }
  }, []);

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
      {!loading && !error && <StoreTable stores={stores} />}
    </div>
  );
}
