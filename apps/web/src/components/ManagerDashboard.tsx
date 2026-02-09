'use client';

import { useTranslation } from 'react-i18next';
import KPICard from '@/components/KPICard';
import AIInsightsCard from '@/components/AIInsightsCard';
import TeamPerformanceCard from '@/components/TeamPerformanceCard';

const mockReps = [
  { id: 1, name: { en: 'Zhang Wei', zh: '张伟' }, territory: { en: 'Pudong District A', zh: '浦东A区' }, visits: 14, target: 18, coverage: 78, online: true },
  { id: 2, name: { en: 'Li Na', zh: '李娜' }, territory: { en: 'Pudong District B', zh: '浦东B区' }, visits: 17, target: 18, coverage: 92, online: true },
  { id: 3, name: { en: 'Wang Jun', zh: '王军' }, territory: { en: 'Puxi District A', zh: '浦西A区' }, visits: 11, target: 18, coverage: 64, online: false },
  { id: 4, name: { en: 'Chen Mei', zh: '陈梅' }, territory: { en: 'Puxi District B', zh: '浦西B区' }, visits: 16, target: 18, coverage: 85, online: true },
];

export default function ManagerDashboard() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const kpis = [
    {
      label: t('totalStores'),
      value: '2,847',
      icon: <StoreKPIIcon />,
      color: '#3B82F6',
      delta: '+12',
    },
    {
      label: t('visitedThisWeek'),
      value: '1,204',
      icon: <CheckIcon />,
      color: '#10B981',
      delta: '42%',
    },
    {
      label: t('oosAlerts'),
      value: '38',
      icon: <AlertIcon />,
      color: '#EF4444',
      delta: '-5',
    },
    {
      label: t('topPerformer'),
      value: lang === 'en' ? 'Li Na' : '李娜',
      icon: <TrophyIcon />,
      color: '#F59E0B',
      delta: '92%',
    },
  ];

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-white mb-6">{t('dashboard')}</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: AI Insights + Audit */}
        <div className="col-span-2 space-y-6">
          <AIInsightsCard
            photosProcessed="187"
            alertsGenerated="12"
            avgShareOfShelf="31%"
          />

          {/* Audit Mode */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="text-white text-[15px] font-bold">{t('auditMode')}</span>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-xl border border-warning/30 bg-warning/[0.08] text-warning text-sm font-semibold hover:bg-warning/[0.15] transition-colors">
                {t('randomCheck')}
              </button>
              <button className="flex-1 py-3 rounded-xl border border-primary/30 bg-primary/[0.08] text-primary text-sm font-semibold hover:bg-primary/[0.15] transition-colors">
                {t('assignAudit')}
              </button>
            </div>
            <p className="text-muted text-[11px] mt-3 leading-relaxed">
              {t('auditDescription')}
            </p>
          </div>
        </div>

        {/* Right: Team Performance */}
        <div>
          <h2 className="section-label mb-3">{t('teamPerformance')}</h2>
          <div className="space-y-2">
            {mockReps.map((rep) => (
              <TeamPerformanceCard key={rep.id} rep={rep} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StoreKPIIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 1012 0V2z" />
    </svg>
  );
}
