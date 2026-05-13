'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import type { StoreTier, StoreType } from '@xundian/shared';
import TierBadge from './TierBadge';

interface StoreRow {
  id: string;
  name: string;
  name_zh?: string;
  address?: string;
  gaode_poi_id?: string;
  tier: StoreTier;
  store_type: StoreType;
  status: string;
  lastVisit: string | null;
  lastVisitAt?: string | null;
  sos: number;
}

interface StoreTableProps {
  stores: StoreRow[];
  search: string;
  onSearchChange: (value: string) => void;
  tierFilter: StoreTier | '';
  onTierFilterChange: (value: StoreTier | '') => void;
  typeFilter: StoreType | '';
  onTypeFilterChange: (value: StoreType | '') => void;
}

function formatCheckinTime(value?: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function shortStoreId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

export default function StoreTable({
  stores,
  search,
  onSearchChange,
  tierFilter,
  onTierFilterChange,
  typeFilter,
  onTypeFilterChange,
}: StoreTableProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const filtered = stores.filter((s) => {
    const searchTerm = search.toLowerCase();
    const searchable = [
      s.id,
      s.name,
      s.name_zh,
      s.address,
      s.gaode_poi_id,
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = searchable.includes(searchTerm);
    const matchesTier = tierFilter === '' || s.tier === tierFilter;
    const matchesType = typeFilter === '' || s.store_type === typeFilter;
    return matchesSearch && matchesTier && matchesType;
  });

  const statusColors: Record<string, string> = {
    visited: 'text-success bg-success/15',
    pending: 'text-primary bg-primary/15',
    overdue: 'text-danger bg-danger/15',
    discovered: 'text-purple bg-purple/15',
    in_stock: 'text-success bg-success/15',
    low_stock: 'text-warning bg-warning/15',
    out_of_stock: 'text-danger bg-danger/15',
  };

  const typeLabels: Record<StoreType, string> = {
    supermarket: t('supermarket'),
    convenience: t('convenience'),
    small_shop: t('smallShop'),
    other: t('other'),
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder={t('storeSearchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-field max-w-md"
        />
        <select
          value={tierFilter}
          onChange={(e) => onTierFilterChange(e.target.value as StoreTier | '')}
          className="input-field w-auto"
        >
          <option value="">{t('allTiers')}</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value as StoreType | '')}
          className="input-field w-auto"
        >
          <option value="">{t('allTypes')}</option>
          <option value="supermarket">{t('supermarket')}</option>
          <option value="convenience">{t('convenience')}</option>
          <option value="small_shop">{t('smallShop')}</option>
          <option value="other">{t('other')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-slate-400 font-medium px-4 py-3">{t('storeName')}</th>
              <th className="text-left text-slate-400 font-medium px-4 py-3">{t('storeId')}</th>
              <th className="text-left text-slate-400 font-medium px-4 py-3">{t('tier')}</th>
              <th className="text-left text-slate-400 font-medium px-4 py-3">{t('storeType')}</th>
              <th className="text-left text-slate-400 font-medium px-4 py-3">{t('status')}</th>
              <th className="text-left text-slate-400 font-medium px-4 py-3">{t('lastVisit')}</th>
              <th className="text-left text-slate-400 font-medium px-4 py-3">{t('shelfShare')}</th>
              <th className="text-left text-slate-400 font-medium px-4 py-3">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((store) => {
              const displayName = lang === 'zh' && store.name_zh ? store.name_zh : store.name;
              const statusKey = store.status.replace('_', '') as string;
              const statusClass = statusColors[store.status] || 'text-slate-400 bg-white/[0.05]';
              const checkinTime = formatCheckinTime(store.lastVisitAt);
              return (
                <tr
                  key={store.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{displayName}</div>
                    <div className="text-slate-500 text-xs mt-1 max-w-[260px] truncate">
                      {store.address || t('addressPlaceholder')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-300 bg-white/[0.05] rounded px-2 py-1">
                      {shortStoreId(store.id)}
                    </span>
                    {store.gaode_poi_id && (
                      <div className="text-slate-600 text-[11px] mt-1 font-mono truncate max-w-[120px]">
                        {store.gaode_poi_id}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TierBadge tier={store.tier} />
                  </td>
                  <td className="px-4 py-3 text-slate-300">{typeLabels[store.store_type]}</td>
                  <td className="px-4 py-3">
                    <span className={`badge-pill ${statusClass}`}>
                      {t(statusKey) || store.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <div>{store.lastVisit || '--'}</div>
                    <div className="text-slate-600 text-xs mt-1">
                      {checkinTime || t('checkinTimePlaceholder')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${store.sos > 25 ? 'bg-success' : 'bg-danger'}`}
                          style={{ width: `${Math.min(store.sos, 100)}%` }}
                        />
                      </div>
                      <span className="text-white text-xs font-medium">{store.sos}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/stores/${store.id}`}
                      className="text-primary text-xs font-medium hover:underline"
                    >
                      {t('viewDetails')}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
