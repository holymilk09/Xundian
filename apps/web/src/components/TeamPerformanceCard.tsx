'use client';

import { useTranslation } from 'react-i18next';

interface RepData {
  id: number;
  name: { en: string; zh: string };
  territory: { en: string; zh: string };
  visits: number;
  target: number;
  coverage: number;
  online: boolean;
}

export default function TeamPerformanceCard({ rep }: { rep: RepData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';

  const coverageColor =
    rep.coverage > 80 ? 'bg-success' : rep.coverage > 60 ? 'bg-warning' : 'bg-danger';
  const avatarGradient = rep.online
    ? 'from-primary to-primary-dark'
    : 'from-slate-600 to-slate-700';

  return (
    <div className="glass-card p-4 flex items-center gap-3">
      {/* Avatar */}
      <div className="relative">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-sm font-bold`}
        >
          {rep.name[lang].charAt(0)}
        </div>
        {rep.online && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <span className="text-white text-sm font-semibold truncate">{rep.name[lang]}</span>
          <span className="text-muted text-xs">
            {rep.visits}/{rep.target}
          </span>
        </div>
        <div className="text-muted text-[11px] mt-0.5">{rep.territory[lang]}</div>

        {/* Progress bar */}
        <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full ${coverageColor} transition-all`}
            style={{ width: `${rep.coverage}%` }}
          />
        </div>
        <div className="text-dim text-[10px] mt-1">
          {t('coverage')}: {rep.coverage}%
        </div>
      </div>
    </div>
  );
}
