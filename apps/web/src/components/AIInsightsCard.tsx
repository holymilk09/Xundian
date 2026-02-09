'use client';

import { useTranslation } from 'react-i18next';

interface AIInsightsCardProps {
  photosProcessed: string;
  alertsGenerated: string;
  avgShareOfShelf: string;
}

export default function AIInsightsCard({
  photosProcessed,
  alertsGenerated,
  avgShareOfShelf,
}: AIInsightsCardProps) {
  const { t } = useTranslation();

  const stats = [
    { label: t('photosProcessed'), value: photosProcessed },
    { label: t('alertsGenerated'), value: alertsGenerated },
    { label: t('avgShareOfShelf'), value: avgShareOfShelf },
  ];

  return (
    <div className="rounded-xl p-5 bg-gradient-to-br from-purple/10 to-primary/10 border border-purple/15">
      <div className="flex items-center gap-2 mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1.27a2 2 0 01-3.46 0H6.73a2 2 0 01-3.46 0H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z" />
          <circle cx="7.5" cy="14.5" r="1" fill="#A78BFA" />
          <circle cx="16.5" cy="14.5" r="1" fill="#A78BFA" />
        </svg>
        <span className="text-purple-light text-[15px] font-bold">{t('aiInsights')}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/[0.05] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">{stat.value}</div>
            <div className="text-slate-500 text-[10px] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-danger/[0.08] p-3 text-danger text-xs leading-relaxed">
        {t('oosWarning')}
      </div>
    </div>
  );
}
