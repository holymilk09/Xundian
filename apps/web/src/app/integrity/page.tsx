'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';

function useExportCSV(endpoint: string, filename: string) {
  const [exporting, setExporting] = useState(false);
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // error handled silently
    } finally {
      setExporting(false);
    }
  }, [endpoint, filename]);
  return { exporting, handleExport };
}

const FLAG_TYPES = [
  'gps_too_far',
  'gps_accuracy_low',
  'visit_too_short',
  'impossible_travel',
  'burst_visits',
  'same_gps_different_stores',
  'off_hours',
  'month_end_clustering',
] as const;

const SEVERITIES = ['high', 'medium', 'low'] as const;

interface IntegritySummary {
  total_unresolved: number;
  by_severity: { high: number; medium: number; low: number };
  top_flag_types: { flag_type: string; count: number }[];
}

interface IntegrityFlag {
  id: string;
  flag_type: string;
  employee_id: string;
  employee_name: string;
  store_id: string;
  store_name: string;
  visit_id: string;
  visit_date: string;
  severity: string;
  details: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
}

const severityColors: Record<string, { bg: string; text: string }> = {
  high: { bg: 'bg-[#EF4444]/15', text: 'text-[#EF4444]' },
  medium: { bg: 'bg-[#F59E0B]/15', text: 'text-[#F59E0B]' },
  low: { bg: 'bg-slate-400/15', text: 'text-slate-400' },
};

export default function IntegrityPage() {
  const { t } = useTranslation();
  const user = getUser();
  const isManager =
    user?.role === 'admin' ||
    user?.role === 'area_manager' ||
    user?.role === 'regional_director';

  const [tab, setTab] = useState<'unresolved' | 'resolved'>('unresolved');
  const [severityFilter, setSeverityFilter] = useState('');
  const [flagTypeFilter, setFlagTypeFilter] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { exporting: exportingFlags, handleExport: handleExportFlags } = useExportCSV(
    '/export/integrity',
    `integrity-flags-${new Date().toISOString().split('T')[0]}.csv`,
  );

  const resolvedParam = tab === 'resolved' ? 'true' : 'false';
  const severityParam = severityFilter ? `&severity=${severityFilter}` : '';
  const flagTypeParam = flagTypeFilter ? `&flag_type=${flagTypeFilter}` : '';
  const flagsUrl = `/integrity/flags?resolved=${resolvedParam}${severityParam}${flagTypeParam}`;

  const { data: summary, loading: summaryLoading } = useApi<IntegritySummary>('/integrity/summary');
  const { data: flags, loading: flagsLoading, refetch: refetchFlags } = useApi<IntegrityFlag[]>(flagsUrl);

  const handleResolve = useCallback(async (id: string) => {
    setResolvingId(id);
    try {
      await api.post(`/integrity/flags/${id}/resolve`);
      refetchFlags();
    } catch {
      // error handled silently
    } finally {
      setResolvingId(null);
    }
  }, [refetchFlags]);

  // Non-manager view
  if (!isManager) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-6">{t('visitIntegrity')}</h1>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
          <p className="text-muted">{t('integritySubtitle')}</p>
          <p className="text-slate-500 text-sm mt-2">Manager access only.</p>
        </div>
      </div>
    );
  }

  const allFlags = flags || [];
  const summaryData = summary || { total_unresolved: 0, by_severity: { high: 0, medium: 0, low: 0 }, top_flag_types: [] };

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('visitIntegrity')}</h1>
          <p className="text-muted text-sm mt-1">{t('integritySubtitle')}</p>
        </div>
        <button
          onClick={handleExportFlags}
          disabled={exportingFlags}
          className="bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {exportingFlags ? t('exporting') : t('exportFlags')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <p className="text-slate-400 text-xs mb-1">{t('unresolvedFlags')}</p>
          <p className="text-white text-2xl font-bold">
            {summaryLoading ? '--' : summaryData.total_unresolved}
          </p>
        </div>
        {SEVERITIES.map((sev) => {
          const colors = severityColors[sev] ?? severityColors.low!;
          return (
            <div key={sev} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <p className="text-slate-400 text-xs mb-1 capitalize">{sev}</p>
              <p className={`text-2xl font-bold ${colors!.text}`}>
                {summaryLoading ? '--' : summaryData.by_severity[sev]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Top Flag Types */}
      {summaryData.top_flag_types.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-6">
          <h2 className="text-white text-lg font-semibold mb-3">{t('flagType')}</h2>
          <div className="flex flex-wrap gap-2">
            {summaryData.top_flag_types.map((ft) => (
              <span
                key={ft.flag_type}
                className="px-3 py-1.5 rounded-full text-xs bg-white/[0.06] text-slate-300"
              >
                {t(ft.flag_type)} ({ft.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setTab('unresolved')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'unresolved'
              ? 'bg-primary/15 text-primary'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          {t('unresolvedFlags')}
        </button>
        <button
          onClick={() => setTab('resolved')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'resolved'
              ? 'bg-primary/15 text-primary'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          {t('resolvedFlags')}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3 mb-4">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
        >
          <option value="">{t('allSeverities')}</option>
          {SEVERITIES.map((sev) => (
            <option key={sev} value={sev}>
              {sev.charAt(0).toUpperCase() + sev.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={flagTypeFilter}
          onChange={(e) => setFlagTypeFilter(e.target.value)}
          className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
        >
          <option value="">{t('flagType')}</option>
          {FLAG_TYPES.map((ft) => (
            <option key={ft} value={ft}>
              {t(ft)}
            </option>
          ))}
        </select>
      </div>

      {/* Flags Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        {flagsLoading && (
          <div className="p-6 text-center">
            <p className="text-slate-400 text-sm">Loading...</p>
          </div>
        )}
        {!flagsLoading && allFlags.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-muted text-sm">
              {tab === 'unresolved' ? t('noGoalsSet') : t('noGoalsSet')}
            </p>
          </div>
        )}
        {!flagsLoading && allFlags.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-slate-400 text-xs font-medium py-3 px-4">
                    {t('flagType')}
                  </th>
                  <th className="text-left text-slate-400 text-xs font-medium py-3 px-4">
                    {t('repName')}
                  </th>
                  <th className="text-left text-slate-400 text-xs font-medium py-3 px-4">
                    {t('storeName')}
                  </th>
                  <th className="text-left text-slate-400 text-xs font-medium py-3 px-4">
                    {t('visitDate')}
                  </th>
                  <th className="text-left text-slate-400 text-xs font-medium py-3 px-4">
                    {t('status')}
                  </th>
                  <th className="text-left text-slate-400 text-xs font-medium py-3 px-4">
                    {t('details')}
                  </th>
                  {tab === 'unresolved' && (
                    <th className="text-right text-slate-400 text-xs font-medium py-3 px-4">
                      {t('actions')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {allFlags.map((flag) => {
                  const colors = severityColors[flag.severity] ?? severityColors.low!;
                  return (
                    <tr
                      key={flag.id}
                      className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="text-slate-300 text-sm">{t(flag.flag_type)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white text-sm">{flag.employee_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-300 text-sm">{flag.store_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-400 text-sm">
                          {flag.visit_date
                            ? new Date(flag.visit_date).toLocaleDateString()
                            : '--'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors!.bg} ${colors!.text}`}
                        >
                          {flag.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        <span className="text-slate-400 text-xs truncate block">
                          {flag.details}
                        </span>
                      </td>
                      {tab === 'unresolved' && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleResolve(flag.id)}
                            disabled={resolvingId === flag.id}
                            className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            {resolvingId === flag.id ? t('resolving') : t('resolve')}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
