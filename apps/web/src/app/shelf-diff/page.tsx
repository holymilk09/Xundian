'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import TierBadge from '@/components/TierBadge';
import type { StoreTier, ShelfDiffSeverity } from '@xundian/shared';

interface ShelfDiffItem {
  id: string;
  store_id: string;
  store_name: string;
  store_name_zh?: string;
  store_tier: StoreTier;
  diff_result: {
    sos_change: { previous: number; current: number; delta: string };
    facing_changes: { product: string; previous: number; current: number; change: string }[];
    competitor_changes: { brand: string; change: string }[];
    new_items_detected: string[];
    missing_items: string[];
    compliance: { price_tag_present: boolean; product_facing_forward: boolean; shelf_clean: boolean };
  };
  severity: ShelfDiffSeverity;
  confidence: number;
  reviewed: boolean;
  created_at: string;
}

const severityColors: Record<ShelfDiffSeverity, { bg: string; text: string; label: string }> = {
  positive: { bg: 'bg-success/15', text: 'text-success', label: 'positive' },
  neutral: { bg: 'bg-slate-400/15', text: 'text-slate-400', label: 'neutral' },
  warning: { bg: 'bg-warning/15', text: 'text-warning', label: 'warning' },
  critical: { bg: 'bg-danger/15', text: 'text-danger', label: 'critical' },
};

export default function ShelfDiffPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const user = getUser();
  const isManager =
    user?.role === 'admin' ||
    user?.role === 'area_manager' ||
    user?.role === 'regional_director';
  const { data, loading, error } = useApi<ShelfDiffItem[]>('/shelf-diffs');
  const [severityFilter, setSeverityFilter] = useState<ShelfDiffSeverity | 'all'>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'reviewed' | 'unreviewed'>('all');
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await api.get('/export/shelf-analysis', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shelf-analysis-${new Date().toISOString().split('T')[0]}.csv`);
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

  const items = data || [];
  const filtered = items.filter((item) => {
    if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
    if (reviewFilter === 'reviewed' && !item.reviewed) return false;
    if (reviewFilter === 'unreviewed' && item.reviewed) return false;
    return true;
  });

  const severityCounts: Record<ShelfDiffSeverity, number> = { positive: 0, neutral: 0, warning: 0, critical: 0 };
  items.forEach((item) => { severityCounts[item.severity]++; });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('shelfComparisons')}</h1>
          <p className="text-muted text-sm mt-1">{t('shelfDiffSubtitle')}</p>
        </div>
        {isManager && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {exporting ? t('exporting') : t('exportShelfData')}
          </button>
        )}
      </div>

      {loading && <p className="text-slate-400">Loading...</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && (
        <>
          {/* Severity summary cards */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {(Object.keys(severityColors) as ShelfDiffSeverity[]).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(severityFilter === sev ? 'all' : sev)}
                className={`glass-card p-3 text-center transition-all ${
                  severityFilter === sev ? 'ring-1 ring-white/20' : ''
                }`}
              >
                <div className={`text-2xl font-bold ${severityColors[sev].text}`}>
                  {severityCounts[sev]}
                </div>
                <div className="text-muted text-xs mt-1">{t(sev)}</div>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSeverityFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                severityFilter === 'all' ? 'bg-white/10 text-white' : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
              }`}
            >
              {t('allSeverities')} ({items.length})
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setReviewFilter(reviewFilter === 'unreviewed' ? 'all' : 'unreviewed')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                reviewFilter === 'unreviewed' ? 'bg-warning/20 text-warning' : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
              }`}
            >
              {t('unreviewed')} ({items.filter((i) => !i.reviewed).length})
            </button>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-muted">{t('noShelfDiffs')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                const sev = severityColors[item.severity];
                const sosDelta = item.diff_result.sos_change;
                const isPositiveSos = sosDelta.current >= sosDelta.previous;

                return (
                  <Link key={item.id} href={`/shelf-diff/${item.id}`} className="block">
                    <div className="glass-card p-4 hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <TierBadge tier={item.store_tier} />
                          <div>
                            <h3 className="text-white font-semibold text-sm">
                              {lang === 'zh' ? item.store_name_zh || item.store_name : item.store_name}
                            </h3>
                            <p className="text-muted text-xs mt-0.5">
                              {new Date(item.created_at).toLocaleDateString()} &middot; {t('confidence')}: {Math.round(item.confidence * 100)}%
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!item.reviewed && (
                            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                          )}
                          <span className={`badge-pill ${sev.bg} ${sev.text}`}>
                            {t(item.severity)}
                          </span>
                        </div>
                      </div>

                      {/* Quick metrics */}
                      <div className="flex gap-4 mt-3 pt-3 border-t border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <span className="text-muted text-xs">{t('sosChange')}:</span>
                          <span className={`text-sm font-semibold ${isPositiveSos ? 'text-success' : 'text-danger'}`}>
                            {sosDelta.delta}
                          </span>
                          <span className="text-slate-500 text-xs">
                            ({sosDelta.previous}% → {sosDelta.current}%)
                          </span>
                        </div>

                        {item.diff_result.missing_items.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-danger text-xs">
                              {item.diff_result.missing_items.length} {t('missingItems').toLowerCase()}
                            </span>
                          </div>
                        )}

                        {item.diff_result.new_items_detected.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-warning text-xs">
                              {item.diff_result.new_items_detected.length} {t('newItemsDetected').toLowerCase()}
                            </span>
                          </div>
                        )}

                        {/* Compliance dots */}
                        <div className="ml-auto flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${item.diff_result.compliance.price_tag_present ? 'bg-success' : 'bg-danger'}`}
                            title={t('priceTags')} />
                          <span className={`w-2 h-2 rounded-full ${item.diff_result.compliance.product_facing_forward ? 'bg-success' : 'bg-danger'}`}
                            title={t('facingForward')} />
                          <span className={`w-2 h-2 rounded-full ${item.diff_result.compliance.shelf_clean ? 'bg-success' : 'bg-danger'}`}
                            title={t('shelfClean')} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
