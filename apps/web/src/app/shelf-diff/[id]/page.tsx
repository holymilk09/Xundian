'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';
import TierBadge from '@/components/TierBadge';
import type { StoreTier, ShelfDiffSeverity } from '@xundian/shared';

interface ShelfDiffDetail {
  id: string;
  store_id: string;
  store_name: string;
  store_name_zh?: string;
  store_tier: StoreTier;
  store_address?: string;
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
  reviewed_by?: string;
  created_at: string;
  current_photo_url?: string;
  previous_photo_url?: string;
}

const severityStyles: Record<ShelfDiffSeverity, { bg: string; text: string }> = {
  positive: { bg: 'bg-success/15', text: 'text-success' },
  neutral: { bg: 'bg-slate-400/15', text: 'text-slate-400' },
  warning: { bg: 'bg-warning/15', text: 'text-warning' },
  critical: { bg: 'bg-danger/15', text: 'text-danger' },
};

export default function ShelfDiffDetailPage({ params }: { params: { id: string } }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const { data: diff, loading, error, refetch } = useApi<ShelfDiffDetail>(`/shelf-diffs/${params.id}`);

  const handleMarkReviewed = useCallback(async () => {
    try {
      await api.post(`/shelf-diffs/${params.id}/review`);
      refetch();
    } catch {
      // silent
    }
  }, [params.id, refetch]);

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!diff) return <p className="text-slate-400">Not found</p>;

  const sev = severityStyles[diff.severity];
  const sos = diff.diff_result.sos_change;
  const isPositiveSos = sos.current >= sos.previous;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <TierBadge tier={diff.store_tier} />
          <span className={`badge-pill ${sev.bg} ${sev.text}`}>{t(diff.severity)}</span>
          {diff.reviewed ? (
            <span className="badge-pill bg-success/15 text-success">{t('reviewed')}</span>
          ) : (
            <span className="badge-pill bg-warning/15 text-warning">{t('unreviewed')}</span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">
          {lang === 'zh' ? diff.store_name_zh || diff.store_name : diff.store_name}
        </h1>
        <p className="text-muted text-sm mt-1">
          {diff.store_address && `${diff.store_address} · `}
          {new Date(diff.created_at).toLocaleString()} · {t('confidence')}: {Math.round(diff.confidence * 100)}%
        </p>
      </div>

      {/* SOS Change — hero card */}
      <div className="glass-card p-5 mb-6">
        <h2 className="section-label text-xs mb-3">{t('sosChange')}</h2>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-slate-400 text-xs mb-1">{t('previous')}</div>
            <div className="text-2xl font-bold text-white">{sos.previous}%</div>
          </div>
          <div className="text-3xl text-slate-500">→</div>
          <div className="text-center">
            <div className="text-slate-400 text-xs mb-1">{t('current')}</div>
            <div className="text-2xl font-bold text-white">{sos.current}%</div>
          </div>
          <div className="ml-4">
            <div className={`text-3xl font-bold ${isPositiveSos ? 'text-success' : 'text-danger'}`}>
              {sos.delta}
            </div>
          </div>
          {/* Progress bars */}
          <div className="flex-1 space-y-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-muted text-[10px] w-12">{t('previous')}</span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                  <div className="h-full rounded-full bg-slate-500" style={{ width: `${sos.previous}%` }} />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-muted text-[10px] w-12">{t('current')}</span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isPositiveSos ? 'bg-success' : 'bg-danger'}`}
                    style={{ width: `${sos.current}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Facing Changes */}
        <div className="glass-card p-4">
          <h2 className="section-label text-xs mb-3">{t('facingChanges')}</h2>
          {diff.diff_result.facing_changes.length === 0 ? (
            <p className="text-muted text-sm">--</p>
          ) : (
            <div className="space-y-0">
              {diff.diff_result.facing_changes.map((fc, i) => {
                const delta = fc.current - fc.previous;
                return (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-slate-300 text-sm">{fc.product}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-xs">{fc.previous} → {fc.current}</span>
                      <span className={`text-sm font-semibold ${delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-slate-400'}`}>
                        {fc.change}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Competitor Changes */}
        <div className="glass-card p-4">
          <h2 className="section-label text-xs mb-3">{t('competitorChanges')}</h2>
          {diff.diff_result.competitor_changes.length === 0 ? (
            <p className="text-muted text-sm">--</p>
          ) : (
            <div className="space-y-0">
              {diff.diff_result.competitor_changes.map((cc, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-slate-300 text-sm">{cc.brand}</span>
                  <span className="text-warning text-sm">{cc.change}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New / Missing Items */}
        <div className="glass-card p-4">
          <h2 className="section-label text-xs mb-3">{t('newItemsDetected')}</h2>
          {diff.diff_result.new_items_detected.length === 0 ? (
            <p className="text-muted text-sm">--</p>
          ) : (
            <ul className="space-y-1">
              {diff.diff_result.new_items_detected.map((item, i) => (
                <li key={i} className="text-warning text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                  {item}
                </li>
              ))}
            </ul>
          )}

          <h2 className="section-label text-xs mb-3 mt-5">{t('missingItems')}</h2>
          {diff.diff_result.missing_items.length === 0 ? (
            <p className="text-muted text-sm">--</p>
          ) : (
            <ul className="space-y-1">
              {diff.diff_result.missing_items.map((item, i) => (
                <li key={i} className="text-danger text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Compliance */}
        <div className="glass-card p-4">
          <h2 className="section-label text-xs mb-3">{t('complianceCheck')}</h2>
          <div className="space-y-3">
            {[
              { key: 'priceTags', value: diff.diff_result.compliance.price_tag_present },
              { key: 'facingForward', value: diff.diff_result.compliance.product_facing_forward },
              { key: 'shelfClean', value: diff.diff_result.compliance.shelf_clean },
            ].map((check) => (
              <div key={check.key} className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">{t(check.key)}</span>
                <span className={`text-sm font-semibold ${check.value ? 'text-success' : 'text-danger'}`}>
                  {check.value ? t('pass') : t('fail')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mark reviewed button */}
      {!diff.reviewed && (
        <div className="mt-6">
          <button
            onClick={handleMarkReviewed}
            className="px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
          >
            {t('markReviewed')}
          </button>
        </div>
      )}
    </div>
  );
}
