'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';

type StoreTier = 'A' | 'B' | 'C';

const tierColors: Record<StoreTier, string> = {
  A: '#DC2626',
  B: '#F59E0B',
  C: '#6B7280',
};

const priorityColors: Record<string, string> = {
  high: '#EF4444',
  normal: '#3B82F6',
  low: '#6B7280',
};

export default function RepDashboard() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const [searchRadius, setSearchRadius] = useState(2);

  const { data: repStats, loading: statsLoading } = useApi<any>('/analytics/rep');
  const { data: alerts, loading: alertsLoading } = useApi<any[]>('/alerts');
  const { data: todayRoute, loading: routeLoading, refetch: refetchRoute } = useApi<any>('/routes/today');
  const [generating, setGenerating] = useState(false);

  const loading = statsLoading || alertsLoading || routeLoading;

  const handleGenerateRoute = async () => {
    setGenerating(true);
    try {
      await api.post('/routes/optimize', { start_lat: 31.23, start_lng: 121.47 });
      await refetchRoute();
    } catch {
      // silently fail
    } finally {
      setGenerating(false);
    }
  };

  const stats = [
    { label: t('visited'), value: String(repStats?.visited_this_week ?? '--'), color: '#10B981' },
    { label: t('pending'), value: String(repStats?.pending ?? '--'), color: '#3B82F6' },
    { label: t('overdue'), value: String(repStats?.overdue ?? '--'), color: '#EF4444' },
    { label: t('discovered'), value: '0', color: '#8B5CF6' },
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-6">{t('dashboard')}</h1>

      {loading && <p className="text-slate-400 mb-4">Loading...</p>}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl text-center py-4 px-2"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${s.color}22`,
            }}
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Today's Route Card */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(16,185,129,0.08))',
          border: '1px solid rgba(59,130,246,0.15)',
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <span className="text-white text-base font-bold">{t('todayRoute')}</span>
          {todayRoute && (
            <span className="text-blue-400 text-sm">
              {todayRoute.waypoints?.length ?? 0} {t('routeStores')} · {todayRoute.total_distance_km ?? '--'} {t('km')}
            </span>
          )}
        </div>

        {!todayRoute && !routeLoading && (
          <p className="text-slate-500 text-sm mb-4">{t('noRouteYet')}</p>
        )}

        <button
          onClick={!todayRoute ? handleGenerateRoute : undefined}
          disabled={generating}
          className="w-full py-3.5 rounded-xl text-white text-[15px] font-semibold border-0 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
            boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
          }}
        >
          {generating ? '...' : todayRoute ? t('startRoute') : t('generateRoute')}
        </button>

        {todayRoute && (
          <div className="flex justify-center gap-5 mt-3">
            <span className="text-slate-500 text-xs">
              {todayRoute.estimated_duration_minutes ? `~${Math.round(todayRoute.estimated_duration_minutes / 60 * 10) / 10}h` : '--'}
            </span>
            <span className="text-slate-500 text-xs">
              {t('routeDistance')}: {todayRoute.total_distance_km ?? '--'} {t('km')}
            </span>
          </div>
        )}

        {/* Waypoint List */}
        {todayRoute?.waypoints && todayRoute.waypoints.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            {todayRoute.waypoints.map((wp: any, i: number) => (
              <div key={wp.store_id} className="flex items-center gap-3 py-2 border-b border-white/[0.06] last:border-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${wp.visited ? 'bg-success/20 text-success' : 'bg-white/10 text-slate-400'}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <span className="text-white text-sm">{wp.store_name}</span>
                  {wp.tier && <span className="ml-2 text-xs text-slate-500">{wp.tier}</span>}
                </div>
                <span className={`text-xs ${wp.visited ? 'text-success' : 'text-slate-500'}`}>
                  {wp.visited ? t('waypointVisited') : t('waypointPending')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nearby Stores */}
      <div className="glass-card p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-white text-sm font-semibold">{t('nearbyStores')}</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">{t('searchRadius')}:</span>
            {[1, 2, 5].map((r) => (
              <button
                key={r}
                onClick={() => setSearchRadius(r)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  searchRadius === r
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-slate-500 border border-white/[0.08] hover:bg-white/10'
                }`}
              >
                {r}{t('km')}
              </button>
            ))}
          </div>
        </div>
        <p className="text-slate-400 text-xs">
          {lang === 'en'
            ? `Found 23 unvisited stores within ${searchRadius}km`
            : `${searchRadius}公里内发现23家未巡检门店`}
        </p>
      </div>

      {/* Revisit Reminders */}
      <h2 className="section-label mb-3">{t('revisitReminders')}</h2>

      {/* Store List */}
      <div className="space-y-2">
        {(alerts || []).map((alert: any) => (
          <Link
            key={alert.id || alert.store_id}
            href={`/stores/${alert.store_id}`}
            className="glass-card p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.06] transition-colors block"
          >
            {/* Priority indicator */}
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg shrink-0"
              style={{ background: `${priorityColors[alert.priority] || '#3B82F6'}15` }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: priorityColors[alert.priority] || '#3B82F6' }}
              />
            </div>

            {/* Store info */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-white text-sm font-semibold truncate">
                  {lang === 'zh' ? (alert.store_name_zh || alert.store_name) : alert.store_name}
                </span>
                {alert.tier && (
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-[5px] shrink-0 ml-2"
                    style={{
                      background: `${tierColors[alert.tier as StoreTier] || '#6B7280'}22`,
                      color: tierColors[alert.tier as StoreTier] || '#6B7280',
                    }}
                  >
                    {alert.tier}
                  </span>
                )}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs font-medium" style={{ color: priorityColors[alert.priority] || '#3B82F6' }}>
                  {alert.reason || alert.priority}
                </span>
                <span className="text-[11px] text-slate-600">
                  {alert.next_visit_date || '--'}
                </span>
              </div>
            </div>

            {/* Chevron */}
            <div className="text-slate-700 text-lg shrink-0">›</div>
          </Link>
        ))}
        {!alertsLoading && (!alerts || alerts.length === 0) && (
          <p className="text-muted text-sm">{lang === 'en' ? 'No revisit reminders' : '暂无巡店提醒'}</p>
        )}
      </div>
    </div>
  );
}
