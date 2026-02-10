'use client';

import { useTranslation } from 'react-i18next';
import { getUser } from '@/lib/auth';

const roleLabels: Record<string, { en: string; zh: string }> = {
  rep: { en: 'Field Rep', zh: '业务员' },
  area_manager: { en: 'Area Manager', zh: '区域经理' },
  regional_director: { en: 'Regional Director', zh: '大区总监' },
  admin: { en: 'Admin', zh: '管理员' },
};

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const user = getUser();

  if (!user) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6">{t('profileTitle')}</h1>
        <p className="text-slate-400">Not logged in</p>
      </div>
    );
  }

  const roleLabel = roleLabels[user.role] || { en: user.role, zh: user.role };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-white mb-6">{t('profileTitle')}</h1>

      <div className="glass-card p-6 space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-2xl font-bold shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white text-lg font-bold">{user.name}</div>
            <span className="badge-pill bg-primary/15 text-primary text-xs">
              {lang === 'zh' ? roleLabel.zh : roleLabel.en}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-3 pt-2 border-t border-white/[0.06]">
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">{t('phone')}</span>
            <span className="text-white text-sm font-mono">{user.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">{t('roleLabel')}</span>
            <span className="text-white text-sm">{lang === 'zh' ? roleLabel.zh : roleLabel.en}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">{t('companyLabel')}</span>
            <span className="text-white text-sm">{user.company_name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
