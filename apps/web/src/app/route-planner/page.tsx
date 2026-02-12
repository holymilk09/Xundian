'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import TierBadge from '@/components/TierBadge';
import type { RouteWaypoint, RoutePriority, StoreTier } from '@xundian/shared';

interface DailyRouteData {
  id: string;
  employee_id: string;
  date: string;
  waypoints: RouteWaypoint[];
  total_distance_km: number;
  estimated_duration_minutes: number;
}

interface TeamRouteData extends DailyRouteData {
  employee_name: string;
}

const priorityConfig: Record<RoutePriority, { bg: string; text: string; labelKey: string }> = {
  overdue: { bg: 'bg-[#EF4444]/15', text: 'text-[#EF4444]', labelKey: 'overdueVisit' },
  due_today: { bg: 'bg-primary/15', text: 'text-primary', labelKey: 'dueToday' },
  high_value_nearby: { bg: 'bg-warning/15', text: 'text-warning', labelKey: 'highValueNearby' },
};

// Chengdu center fallback coordinates
const CHENGDU_CENTER = { lat: 30.5728, lng: 104.0668 };

export default function RoutePlannerPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const user = getUser();
  const isManager =
    user?.role === 'admin' ||
    user?.role === 'area_manager' ||
    user?.role === 'regional_director';

  const [generating, setGenerating] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState<string>('');

  // Rep: own route
  const { data: myRoute, loading: routeLoading, refetch: refetchRoute } =
    useApi<DailyRouteData>('/routes/today');

  // Manager: team routes
  const { data: teamRoutes, loading: teamLoading, refetch: refetchTeam } =
    useApi<TeamRouteData[]>(isManager ? '/routes/team/today' : null);

  // Employees list for manager dropdown
  const { data: employees } = useApi<{ id: string; name: string }[]>(
    isManager ? '/employees' : null,
  );

  const handleGenerateRoute = useCallback(async () => {
    setGenerating(true);
    try {
      await api.post('/routes', {
        start_lat: CHENGDU_CENTER.lat,
        start_lng: CHENGDU_CENTER.lng,
      });
      refetchRoute();
      if (isManager) refetchTeam();
    } catch {
      // error handled silently
    } finally {
      setGenerating(false);
    }
  }, [refetchRoute, refetchTeam, isManager]);

  const route = myRoute;
  const waypoints: RouteWaypoint[] = route?.waypoints || [];
  const visitedCount = waypoints.filter((wp) => wp.visited).length;
  const remainingCount = waypoints.length - visitedCount;

  // Manager: selected rep's route
  const selectedRepRoute = selectedRepId
    ? (teamRoutes || []).find((r) => r.employee_id === selectedRepId)
    : null;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('routePlanner')}</h1>
        </div>
        <button
          onClick={handleGenerateRoute}
          disabled={generating}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {generating ? t('generating') : t('generateTodayRoute')}
        </button>
      </div>

      {/* Summary bar */}
      {waypoints.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">{t('routeProgress')}</p>
            <p className="text-white text-xl font-bold">
              {visitedCount} / {waypoints.length}
            </p>
            <p className="text-muted text-xs">{t('storesVisited')}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">{t('storesRemaining')}</p>
            <p className="text-white text-xl font-bold">{remainingCount}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">{t('totalDistance')}</p>
            <p className="text-white text-xl font-bold">
              {route?.total_distance_km ?? 0} {t('km')}
            </p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">{t('estimatedTime')}</p>
            <p className="text-white text-xl font-bold">
              {route?.estimated_duration_minutes ?? 0} {t('min')}
            </p>
          </div>
        </div>
      )}

      {/* Rep's route: numbered store cards */}
      {!isManager && (
        <div>
          {routeLoading && <p className="text-slate-400 text-sm">Loading...</p>}
          {!routeLoading && waypoints.length === 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
              <p className="text-muted">{t('noRouteGenerated')}</p>
              <p className="text-slate-500 text-sm mt-2">{t('noRouteYet')}</p>
            </div>
          )}
          {!routeLoading && waypoints.length > 0 && (
            <div className="space-y-3">
              {waypoints.map((wp, idx) => {
                const prio = wp.priority ? priorityConfig[wp.priority] : null;
                return (
                  <div
                    key={wp.store_id + idx}
                    className={`bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 transition-opacity ${
                      wp.visited ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                        {wp.sequence}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold text-sm truncate">
                            {lang === 'zh' ? wp.store_name_zh || wp.store_name : wp.store_name}
                          </h3>
                          {wp.tier && <TierBadge tier={wp.tier as StoreTier} />}
                          {prio && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${prio.bg} ${prio.text}`}>
                              {t(prio.labelKey)}
                            </span>
                          )}
                        </div>
                        <p className="text-muted text-xs mt-0.5">
                          {new Date(wp.estimated_arrival).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' · '}
                          {wp.estimated_duration_minutes} {t('min')}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {wp.visited ? (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success">
                            {t('completed')}
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.06] text-slate-400">
                            {t('waypointPending')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Manager view */}
      {isManager && (
        <div>
          {/* Rep selector */}
          <div className="flex items-center gap-4 mb-6">
            <label className="text-slate-400 text-sm">{t('selectRep')}:</label>
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary min-w-[200px]"
            >
              <option value="">-- {t('teamRoutes')} --</option>
              {(employees || []).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Team summary table (no rep selected) */}
          {!selectedRepId && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h2 className="text-white text-lg font-semibold mb-4">{t('teamRoutes')}</h2>
              {teamLoading && <p className="text-slate-400 text-sm">Loading...</p>}
              {!teamLoading && (!teamRoutes || teamRoutes.length === 0) && (
                <p className="text-muted text-sm text-center py-6">{t('noRouteGenerated')}</p>
              )}
              {!teamLoading && teamRoutes && teamRoutes.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left text-slate-400 text-xs font-medium py-3 pr-4">
                          {t('repName')}
                        </th>
                        <th className="text-right text-slate-400 text-xs font-medium py-3 px-3">
                          {t('stores')}
                        </th>
                        <th className="text-right text-slate-400 text-xs font-medium py-3 px-3">
                          {t('totalDistance')}
                        </th>
                        <th className="text-right text-slate-400 text-xs font-medium py-3 px-3">
                          {t('estimatedTime')}
                        </th>
                        <th className="text-right text-slate-400 text-xs font-medium py-3 pl-3">
                          {t('completed')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamRoutes.map((tr) => {
                        const wps = (tr.waypoints || []) as RouteWaypoint[];
                        const done = wps.filter((w) => w.visited).length;
                        const pct = wps.length > 0 ? Math.round((done / wps.length) * 100) : 0;
                        return (
                          <tr
                            key={tr.employee_id}
                            className="border-b border-white/[0.06] hover:bg-white/[0.02] cursor-pointer transition-colors"
                            onClick={() => setSelectedRepId(tr.employee_id)}
                          >
                            <td className="text-white text-sm py-3 pr-4">
                              {tr.employee_name}
                            </td>
                            <td className="text-slate-300 text-sm text-right py-3 px-3">
                              {wps.length}
                            </td>
                            <td className="text-slate-300 text-sm text-right py-3 px-3">
                              {tr.total_distance_km} {t('km')}
                            </td>
                            <td className="text-slate-300 text-sm text-right py-3 px-3">
                              {tr.estimated_duration_minutes} {t('min')}
                            </td>
                            <td className="text-right py-3 pl-3">
                              <span
                                className={`text-sm font-bold ${
                                  pct >= 100
                                    ? 'text-success'
                                    : pct >= 50
                                      ? 'text-primary'
                                      : 'text-warning'
                                }`}
                              >
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Selected rep's route detail */}
          {selectedRepId && selectedRepRoute && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-white text-lg font-semibold">
                  {selectedRepRoute.employee_name}
                </h2>
                <button
                  onClick={() => setSelectedRepId('')}
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  &larr; {t('teamRoutes')}
                </button>
              </div>
              {((selectedRepRoute.waypoints || []) as RouteWaypoint[]).map((wp, idx) => {
                const prio = wp.priority ? priorityConfig[wp.priority] : null;
                return (
                  <div
                    key={wp.store_id + idx}
                    className={`bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 transition-opacity ${
                      wp.visited ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                        {wp.sequence}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold text-sm truncate">
                            {lang === 'zh' ? wp.store_name_zh || wp.store_name : wp.store_name}
                          </h3>
                          {wp.tier && <TierBadge tier={wp.tier as StoreTier} />}
                          {prio && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${prio.bg} ${prio.text}`}>
                              {t(prio.labelKey)}
                            </span>
                          )}
                        </div>
                        <p className="text-muted text-xs mt-0.5">
                          {new Date(wp.estimated_arrival).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' · '}
                          {wp.estimated_duration_minutes} {t('min')}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {wp.visited ? (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success">
                            {t('completed')}
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.06] text-slate-400">
                            {t('waypointPending')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedRepId && !selectedRepRoute && !teamLoading && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
              <p className="text-muted">{t('noRouteGenerated')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
