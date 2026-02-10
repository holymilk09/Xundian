'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';
import type { StoreTier } from '@xundian/shared';

interface PendingStore {
  id: string;
  name: string;
  name_zh?: string;
  tier: StoreTier;
  store_type: string;
  address?: string;
  latitude: number;
  longitude: number;
  discovered_by?: string;
  discovered_at?: string;
  discoverer_name?: string;
  storefront_photo_url?: string;
  notes?: string;
  contact_name?: string;
  contact_phone?: string;
}

export default function PendingStoresPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const { data: stores, loading, error, refetch } = useApi<PendingStore[]>('/stores/pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [tierOverride, setTierOverride] = useState<Record<string, string>>({});

  const handleApprove = useCallback(async (storeId: string) => {
    setActionLoading(storeId);
    try {
      const body: Record<string, string> = {};
      if (tierOverride[storeId]) {
        body.tier = tierOverride[storeId];
      }
      await api.post(`/stores/${storeId}/approve`, body);
      refetch();
    } catch {
      // Error shown via refetch state
    } finally {
      setActionLoading(null);
    }
  }, [tierOverride, refetch]);

  const handleReject = useCallback(async (storeId: string) => {
    setActionLoading(storeId);
    try {
      await api.post(`/stores/${storeId}/reject`, { reason: rejectReason || undefined });
      setRejectId(null);
      setRejectReason('');
      refetch();
    } catch {
      // Error shown via refetch state
    } finally {
      setActionLoading(null);
    }
  }, [rejectReason, refetch]);

  const pendingStores = stores || [];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-6">{t('pendingApprovals')}</h1>

      {loading && <p className="text-slate-400">Loading...</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && pendingStores.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-muted">{t('noPendingStores')}</p>
        </div>
      )}

      {!loading && !error && pendingStores.length > 0 && (
        <div className="space-y-4">
          {pendingStores.map((store) => (
            <div key={store.id} className="glass-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-semibold">
                    {lang === 'zh' ? store.name_zh || store.name : store.name}
                    {store.name_zh && lang === 'en' && (
                      <span className="text-slate-400 font-normal ml-2">({store.name_zh})</span>
                    )}
                  </h3>
                  <p className="text-muted text-sm mt-1">
                    {t(store.store_type)} &middot; {store.address || `${store.latitude.toFixed(4)}, ${store.longitude.toFixed(4)}`}
                  </p>

                  <div className="flex gap-4 mt-3 text-xs text-slate-400">
                    {store.discoverer_name && (
                      <span>{t('discoveredBy')}: <span className="text-white">{store.discoverer_name}</span></span>
                    )}
                    {store.discovered_at && (
                      <span>{t('discoveredAt')}: <span className="text-white">{new Date(store.discovered_at).toLocaleDateString()}</span></span>
                    )}
                  </div>

                  {store.notes && (
                    <p className="text-slate-300 text-sm mt-2 bg-white/[0.04] rounded-lg px-3 py-2">
                      {store.notes}
                    </p>
                  )}

                  {(store.contact_name || store.contact_phone) && (
                    <p className="text-muted text-xs mt-2">
                      {store.contact_name && <span>{store.contact_name}</span>}
                      {store.contact_name && store.contact_phone && <span> &middot; </span>}
                      {store.contact_phone && <span>{store.contact_phone}</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Tier override + actions */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="text-muted text-xs">{t('tier')}:</span>
                  <select
                    value={tierOverride[store.id] || store.tier}
                    onChange={(e) => setTierOverride((prev) => ({ ...prev, [store.id]: e.target.value }))}
                    className="bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>

                <div className="flex-1" />

                {rejectId === store.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t('rejectReason')}
                      className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white text-xs w-48 focus:outline-none focus:border-danger"
                    />
                    <button
                      onClick={() => handleReject(store.id)}
                      disabled={actionLoading === store.id}
                      className="px-3 py-1.5 rounded-lg bg-danger text-white text-xs font-medium hover:bg-danger/90 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === store.id ? t('rejecting') : t('reject')}
                    </button>
                    <button
                      onClick={() => { setRejectId(null); setRejectReason(''); }}
                      className="px-3 py-1.5 rounded-lg text-slate-400 text-xs hover:text-white transition-colors"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setRejectId(store.id)}
                      className="px-4 py-2 rounded-lg border border-danger/30 text-danger text-xs font-medium hover:bg-danger/10 transition-colors"
                    >
                      {t('reject')}
                    </button>
                    <button
                      onClick={() => handleApprove(store.id)}
                      disabled={actionLoading === store.id}
                      className="px-4 py-2 rounded-lg bg-success text-white text-xs font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === store.id ? t('approving') : t('approve')}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
