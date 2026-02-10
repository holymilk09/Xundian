'use client';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useApi } from '@/lib/hooks';
import TierBadge from '@/components/TierBadge';

interface Alert {
  id: string;
  store_id: string;
  store_name: string;
  store_name_zh: string;
  tier: string;
  next_visit_date: string;
  priority: string;
  reason: string;
  assigned_to: string;
}

const priorityColors: Record<string, string> = {
  high: 'text-danger bg-danger/15',
  normal: 'text-primary bg-primary/15',
  low: 'text-slate-400 bg-white/[0.06]',
};

export default function AlertsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const { data: alerts, loading, error } = useApi<Alert[]>('/alerts');

  if (loading) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-6">{t('alerts')}</h1>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-6">{t('alerts')}</h1>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {(!alerts || alerts.length === 0) ? (
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-3">&#10003;</div>
          <p className="text-slate-400">{t('noPendingAlerts')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Link key={alert.id} href={`/stores/${alert.store_id}`}>
              <div className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.06] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-semibold truncate">
                      {lang === 'zh' ? alert.store_name_zh : alert.store_name}
                    </span>
                    <TierBadge tier={alert.tier as any} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge-pill text-xs ${priorityColors[alert.priority] || priorityColors.normal}`}>
                      {t(`${alert.priority}Priority`)}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {t(alert.reason)}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-slate-400 text-xs">{t('dueDate')}</div>
                  <div className="text-white text-sm font-medium">{alert.next_visit_date}</div>
                </div>
                <div className="text-slate-700 text-lg shrink-0">&#8250;</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
