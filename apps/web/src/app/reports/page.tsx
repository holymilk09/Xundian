'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';

interface WeeklyReport {
  week_start: string;
  executive_summary: {
    total_visits: number;
    unique_stores: number;
    coverage_rate: number;
    avg_visit_duration: number;
  };
  rep_performance: {
    employee_id: string;
    employee_name: string;
    visits: number;
    unique_stores: number;
    avg_duration: number;
    photos: number;
    flagged_count: number;
  }[];
  sos_changes: {
    store_name: string;
    product_name: string;
    before_percent: number;
    after_percent: number;
  }[];
  oos_incidents: {
    count: number;
    items: { store_name: string; product_name: string; detected_at: string }[];
  };
  goal_snapshot: {
    metric: string;
    target: number;
    current: number;
    percent: number;
  }[];
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0] as string;
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const user = getUser();
  const isManager =
    user?.role === 'admin' ||
    user?.role === 'area_manager' ||
    user?.role === 'regional_director';

  const [currentWeek, setCurrentWeek] = useState(() => getWeekStart(new Date()));
  const [exporting, setExporting] = useState<string | null>(null);

  const reportUrl = useMemo(() => `/reports/weekly?week_start=${currentWeek}`, [currentWeek]);
  const { data: report, loading, error } = useApi<WeeklyReport>(reportUrl);

  const goPrevWeek = () => {
    const d = new Date(currentWeek + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    setCurrentWeek(getWeekStart(d));
  };

  const goNextWeek = () => {
    const d = new Date(currentWeek + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    const nextMonday = getWeekStart(d);
    // Don't go past current week
    const thisWeek = getWeekStart(new Date());
    if (nextMonday <= thisWeek) {
      setCurrentWeek(nextMonday);
    }
  };

  const handleExportCSV = useCallback(async () => {
    setExporting('csv');
    try {
      const res = await api.get(`/reports/weekly/export/csv?week_start=${currentWeek}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `weekly-report-${currentWeek}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // error handled silently
    } finally {
      setExporting(null);
    }
  }, [currentWeek]);

  // Non-manager view
  if (!isManager) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-6">{t('weeklyReports')}</h1>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
          <p className="text-muted">{t('weeklyReportsSubtitle')}</p>
          <p className="text-slate-500 text-sm mt-2">Manager access only.</p>
        </div>
      </div>
    );
  }

  const exec = report?.executive_summary;
  const repPerf = report?.rep_performance || [];
  const sosChanges = report?.sos_changes || [];
  const oos = report?.oos_incidents;
  const goalSnap = report?.goal_snapshot || [];

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('weeklyReports')}</h1>
          <p className="text-muted text-sm mt-1">{t('weeklyReportsSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting === 'csv' || !report}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {exporting === 'csv' ? t('exporting') : t('exportCSV')}
          </button>
          <button
            disabled
            className="bg-white/[0.06] text-slate-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
            title="Coming soon"
          >
            {t('exportExcel')}
          </button>
          <button
            disabled
            className="bg-white/[0.06] text-slate-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
            title="Coming soon"
          >
            {t('exportPDF')}
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={goPrevWeek}
          className="bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 px-3 py-2 rounded-lg text-sm transition-colors"
          title={t('previousWeek')}
        >
          &#8592; {t('previousWeek')}
        </button>
        <span className="text-white text-sm font-medium px-4">
          {t('weekOf')} {formatWeekLabel(currentWeek)}
        </span>
        <button
          onClick={goNextWeek}
          className="bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 px-3 py-2 rounded-lg text-sm transition-colors"
          title={t('nextWeek')}
        >
          {t('nextWeek')} &#8594;
        </button>
      </div>

      {loading && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
          <p className="text-slate-400">Loading...</p>
        </div>
      )}
      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {!loading && !report && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
          <p className="text-muted">{t('noReportData')}</p>
        </div>
      )}

      {!loading && report && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <h2 className="text-white text-lg font-semibold mb-4">{t('executiveSummary')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-slate-400 text-xs mb-1">{t('visits')}</p>
                <p className="text-white text-2xl font-bold">{exec?.total_visits ?? '--'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">{t('uniqueStores')}</p>
                <p className="text-white text-2xl font-bold">{exec?.unique_stores ?? '--'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">{t('coverageRate')}</p>
                <p className="text-white text-2xl font-bold">
                  {exec?.coverage_rate != null ? `${Math.round(exec.coverage_rate)}%` : '--'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">{t('avgDuration')}</p>
                <p className="text-white text-2xl font-bold">
                  {exec?.avg_visit_duration != null ? `${Math.round(exec.avg_visit_duration)} ${t('min')}` : '--'}
                </p>
              </div>
            </div>
          </div>

          {/* Rep Performance Table */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <h2 className="text-white text-lg font-semibold mb-4">{t('repPerformance')}</h2>
            {repPerf.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">{t('noReportData')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-slate-400 text-xs font-medium py-3 pr-4">
                        {t('name')}
                      </th>
                      <th className="text-right text-slate-400 text-xs font-medium py-3 px-3">
                        {t('visits')}
                      </th>
                      <th className="text-right text-slate-400 text-xs font-medium py-3 px-3">
                        {t('uniqueStores')}
                      </th>
                      <th className="text-right text-slate-400 text-xs font-medium py-3 px-3">
                        {t('avgDuration')}
                      </th>
                      <th className="text-right text-slate-400 text-xs font-medium py-3 px-3">
                        {t('photo')}
                      </th>
                      <th className="text-right text-slate-400 text-xs font-medium py-3 pl-3">
                        {t('flagged')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {repPerf.map((rep) => (
                      <tr
                        key={rep.employee_id}
                        className="border-b border-white/[0.06]"
                      >
                        <td className="text-white text-sm py-3 pr-4">{rep.employee_name}</td>
                        <td className="text-slate-300 text-sm text-right py-3 px-3">
                          {rep.visits}
                        </td>
                        <td className="text-slate-300 text-sm text-right py-3 px-3">
                          {rep.unique_stores}
                        </td>
                        <td className="text-slate-300 text-sm text-right py-3 px-3">
                          {Math.round(rep.avg_duration)} {t('min')}
                        </td>
                        <td className="text-slate-300 text-sm text-right py-3 px-3">
                          {rep.photos}
                        </td>
                        <td className="text-right py-3 pl-3">
                          {rep.flagged_count > 0 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-danger/15 text-danger">
                              {rep.flagged_count}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Share of Shelf Changes */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <h2 className="text-white text-lg font-semibold mb-4">{t('sosChanges')}</h2>
            {sosChanges.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">{t('noReportData')}</p>
            ) : (
              <div className="space-y-2">
                {sosChanges.map((item, idx) => {
                  const diff = item.after_percent - item.before_percent;
                  const isPositive = diff > 0;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                    >
                      <div>
                        <span className="text-white text-sm">{item.store_name}</span>
                        <span className="text-slate-500 text-xs ml-2">{item.product_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm">{item.before_percent}%</span>
                        <span className="text-slate-600">&#8594;</span>
                        <span className="text-white text-sm">{item.after_percent}%</span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isPositive
                              ? 'bg-success/15 text-success'
                              : diff < 0
                                ? 'bg-danger/15 text-danger'
                                : 'bg-white/[0.06] text-slate-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}{diff}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* OOS Incidents */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <h2 className="text-white text-lg font-semibold mb-4">
              {t('oosIncidents')}
              {oos && (
                <span className="text-slate-400 text-sm font-normal ml-2">
                  ({oos.count})
                </span>
              )}
            </h2>
            {!oos || oos.items.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">{t('noReportData')}</p>
            ) : (
              <div className="space-y-2">
                {oos.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                  >
                    <div>
                      <span className="text-white text-sm">{item.store_name}</span>
                      <span className="text-slate-500 text-xs ml-2">{item.product_name}</span>
                    </div>
                    <span className="text-slate-400 text-xs">
                      {new Date(item.detected_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Goal Progress Snapshot */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <h2 className="text-white text-lg font-semibold mb-4">{t('goalSnapshot')}</h2>
            {goalSnap.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">{t('noGoalsSet')}</p>
            ) : (
              <div className="space-y-4">
                {goalSnap.map((goal, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm">{t(goal.metric)}</span>
                      <span className="text-slate-400 text-xs">
                        {goal.current}/{goal.target}
                      </span>
                    </div>
                    <div className="bg-white/[0.06] rounded-full h-2">
                      <div
                        className={`rounded-full h-2 transition-all ${
                          goal.percent >= 100
                            ? 'bg-success'
                            : goal.percent >= 50
                              ? 'bg-primary'
                              : 'bg-warning'
                        }`}
                        style={{ width: `${Math.min(100, goal.percent)}%` }}
                      />
                    </div>
                    <div className="text-right mt-0.5">
                      <span
                        className={`text-xs font-medium ${
                          goal.percent >= 100
                            ? 'text-success'
                            : goal.percent >= 50
                              ? 'text-primary'
                              : 'text-warning'
                        }`}
                      >
                        {Math.round(goal.percent)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
