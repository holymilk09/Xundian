'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_TIER_CONFIG } from '@xundian/shared';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [tierConfig, setTierConfig] = useState(DEFAULT_TIER_CONFIG);
  const [language, setLanguage] = useState(i18n.language);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, loading, error } = useApi<any>('/company');

  useEffect(() => {
    if (data) {
      setCompanyName(data.name || '');
      setCompanyCode(data.company_code || '');
      if (data.tier_config) {
        setTierConfig(data.tier_config);
      }
    }
  }, [data]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const updateTierDays = (tier: 'A' | 'B' | 'C', days: number) => {
    setTierConfig((prev) => ({
      ...prev,
      [tier]: { revisit_days: days },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/company', { name: companyName, tier_config: tierConfig });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">{t('settings')}</h1>

      <div className="space-y-6">
        {/* Company Profile */}
        <div className="glass-card p-6">
          <h2 className="text-white text-lg font-semibold mb-4">{t('companyProfile')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">{t('companyName')}</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">{t('companyCode')}</label>
              <input
                type="text"
                value={companyCode}
                className="input-field"
                disabled
              />
            </div>
          </div>
        </div>

        {/* Tier Configuration */}
        <div className="glass-card p-6">
          <h2 className="text-white text-lg font-semibold mb-4">{t('tierConfiguration')}</h2>
          <div className="space-y-3">
            {(['A', 'B', 'C'] as const).map((tier) => {
              const colors = { A: 'border-tier-a/30', B: 'border-tier-b/30', C: 'border-tier-c/30' };
              const textColors = { A: 'text-tier-a', B: 'text-tier-b', C: 'text-tier-c' };
              return (
                <div
                  key={tier}
                  className={`flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border ${colors[tier]}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-lg ${textColors[tier]}`}>{tier}</span>
                    <span className="text-slate-400 text-sm">{t('revisitDays')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={tierConfig[tier].revisit_days}
                      onChange={(e) => updateTierDays(tier, parseInt(e.target.value) || 0)}
                      className="input-field w-20 text-center"
                      min={1}
                      max={90}
                    />
                    <span className="text-muted text-sm">{i18n.language === 'en' ? 'days' : '天'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Language Preference */}
        <div className="glass-card p-6">
          <h2 className="text-white text-lg font-semibold mb-4">{t('languagePreference')}</h2>
          <div className="flex gap-3">
            <button
              onClick={() => handleLanguageChange('en')}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                language === 'en'
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.06]'
              }`}
            >
              {t('english')}
            </button>
            <button
              onClick={() => handleLanguageChange('zh')}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                language === 'zh'
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.06]'
              }`}
            >
              {t('chinese')}
            </button>
          </div>
        </div>

        {/* Save */}
        <button
          className="btn-primary disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '...' : saved ? (i18n.language === 'en' ? 'Saved!' : '已保存!') : t('saveChanges')}
        </button>
      </div>
    </div>
  );
}
