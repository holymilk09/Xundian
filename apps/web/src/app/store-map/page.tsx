'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import TierBadge from '@/components/TierBadge';
import type { StoreTier } from '@xundian/shared';

interface MapStore {
  id: string;
  name: string;
  name_zh?: string;
  tier: StoreTier;
  store_type: string;
  address?: string;
  latitude: number;
  longitude: number;
  approval_status?: string;
  last_visit_at?: string;
  last_stock_status?: string;
  next_revisit_date?: string;
}

type StoreStatus = 'visited' | 'overdue' | 'pending' | 'discovered';

function deriveStatus(store: MapStore): StoreStatus {
  if (store.approval_status === 'pending') return 'discovered';
  if (!store.last_visit_at) return 'pending';
  if (store.next_revisit_date && new Date(store.next_revisit_date) < new Date()) return 'overdue';
  return 'visited';
}

const statusColors: Record<StoreStatus, string> = {
  visited: '#10B981',
  overdue: '#EF4444',
  pending: '#3B82F6',
  discovered: '#8B5CF6',
};

// Chengdu bounds for SVG projection
const LAT_MIN = 30.52;
const LAT_MAX = 30.61;
const LNG_MIN = 104.02;
const LNG_MAX = 104.11;
const SVG_W = 800;
const SVG_H = 600;

function projectX(lng: number): number {
  return ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * SVG_W;
}

function projectY(lat: number): number {
  // Invert Y axis (higher lat = top of SVG)
  return SVG_H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * SVG_H;
}

const districts = [
  { key: 'jinjiang', x: 520, y: 230 },
  { key: 'wuhou', x: 360, y: 350 },
  { key: 'qingyang', x: 230, y: 220 },
  { key: 'gaoxin', x: 450, y: 430 },
  { key: 'jinniu', x: 280, y: 280 },
  { key: 'chenghua', x: 600, y: 150 },
];

export default function StoreMapPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const { data: stores, loading, error } = useApi<MapStore[]>('/stores/map');
  const [selectedStore, setSelectedStore] = useState<MapStore | null>(null);
  const [statusFilter, setStatusFilter] = useState<StoreStatus | 'all'>('all');

  const allStores = stores || [];
  const filteredStores = statusFilter === 'all'
    ? allStores
    : allStores.filter((s) => deriveStatus(s) === statusFilter);

  const statusCounts: Record<StoreStatus, number> = { visited: 0, overdue: 0, pending: 0, discovered: 0 };
  allStores.forEach((s) => { statusCounts[deriveStatus(s)]++; });

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('storeMap')}</h1>
          <p className="text-muted text-sm mt-1">{t('storeCount')}: {allStores.length}</p>
        </div>
      </div>

      {loading && <p className="text-slate-400">Loading...</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && (
        <div className="flex gap-6">
          {/* Map area */}
          <div className="flex-1">
            {/* Filter chips */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === 'all' ? 'bg-white/10 text-white' : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                }`}
              >
                {t('allStatuses')} ({allStores.length})
              </button>
              {(Object.keys(statusColors) as StoreStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    statusFilter === status ? 'bg-white/10 text-white' : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[status] }} />
                  {t(status)} ({statusCounts[status]})
                </button>
              ))}
            </div>

            {/* SVG Map */}
            <div className="glass-card p-4 overflow-hidden">
              <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto" style={{ minHeight: 400 }}>
                {/* Background */}
                <rect width={SVG_W} height={SVG_H} fill="#0F172A" rx="8" />

                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map((frac) => (
                  <g key={frac}>
                    <line x1={SVG_W * frac} y1="0" x2={SVG_W * frac} y2={SVG_H} stroke="rgba(255,255,255,0.04)" />
                    <line x1="0" y1={SVG_H * frac} x2={SVG_W} y2={SVG_H * frac} stroke="rgba(255,255,255,0.04)" />
                  </g>
                ))}

                {/* District labels */}
                {districts.map((d) => (
                  <text
                    key={d.key}
                    x={d.x}
                    y={d.y}
                    fill="rgba(148,163,184,0.25)"
                    fontSize="16"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {t(d.key)}
                  </text>
                ))}

                {/* Store pins */}
                {filteredStores.map((store) => {
                  const cx = projectX(store.longitude);
                  const cy = projectY(store.latitude);
                  const status = deriveStatus(store);
                  const isSelected = selectedStore?.id === store.id;

                  return (
                    <g
                      key={store.id}
                      onClick={() => setSelectedStore(store)}
                      style={{ cursor: 'pointer' }}
                    >
                      {isSelected && (
                        <circle cx={cx} cy={cy} r="16" fill={statusColors[status]} opacity="0.2">
                          <animate attributeName="r" values="16;20;16" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 8 : 6}
                        fill={statusColors[status]}
                        stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.3)'}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
                <span className="text-muted text-xs">{t('mapLegend')}:</span>
                {(Object.entries(statusColors) as [StoreStatus, string][]).map(([status, color]) => (
                  <span key={status} className="flex items-center gap-1 text-xs text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {t(status)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="w-72 flex-shrink-0">
            {selectedStore ? (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TierBadge tier={selectedStore.tier} />
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: statusColors[deriveStatus(selectedStore)] }}
                  />
                </div>
                <h3 className="text-white font-semibold text-sm">
                  {lang === 'zh' ? selectedStore.name_zh || selectedStore.name : selectedStore.name}
                </h3>
                <p className="text-muted text-xs mt-1">{t(selectedStore.store_type)}</p>
                {selectedStore.address && (
                  <p className="text-muted text-xs mt-1">{selectedStore.address}</p>
                )}
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>{t('status')}</span>
                    <span className="text-white">{t(deriveStatus(selectedStore))}</span>
                  </div>
                  {selectedStore.last_visit_at && (
                    <div className="flex justify-between text-slate-400">
                      <span>{t('lastVisit')}</span>
                      <span className="text-white">{new Date(selectedStore.last_visit_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedStore.next_revisit_date && (
                    <div className="flex justify-between text-slate-400">
                      <span>{t('dueDate')}</span>
                      <span className="text-white">{new Date(selectedStore.next_revisit_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <Link
                  href={`/stores/${selectedStore.id}`}
                  className="block mt-4 text-center px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  {t('viewDetails')}
                </Link>
              </div>
            ) : (
              <div className="glass-card p-4 text-center text-muted text-sm">
                {lang === 'zh' ? '点击门店查看详情' : 'Click a store pin to view details'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
