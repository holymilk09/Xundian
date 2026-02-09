'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [companyCode, setCompanyCode] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'zh' : 'en');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ company_code: companyCode, phone, password });
      router.push('/dashboard');
    } catch {
      setError(i18n.language === 'en' ? 'Invalid credentials' : '登录信息错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-800/40 to-background flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Floating orb */}
      <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_70%)] blur-[40px]" />

      {/* Language toggle */}
      <div className="absolute top-5 right-6">
        <button
          onClick={toggleLang}
          className="bg-white/[0.08] border border-white/[0.12] text-slate-400 px-4 py-1.5 rounded-lg text-[13px] font-medium backdrop-blur-md hover:bg-white/[0.12] transition-colors"
        >
          {t('switchLang')}
        </button>
      </div>

      {/* Login Card */}
      <div className="w-[420px] p-12 rounded-[20px] bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] shadow-[0_25px_50px_rgba(0,0,0,0.4)]">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-[0_8px_24px_rgba(59,130,246,0.3)] text-[28px] text-white">
            巡
          </div>
          <h1 className="text-white text-[28px] font-bold tracking-tight">{t('appName')}</h1>
          <p className="text-muted text-sm mt-1.5">{t('tagline')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <input
            type="text"
            placeholder={t('company')}
            value={companyCode}
            onChange={(e) => setCompanyCode(e.target.value)}
            className="input-field"
            required
          />
          <input
            type="text"
            placeholder={t('email')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
            required
          />
          <input
            type="password"
            placeholder={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
          />

          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}

          <div className="flex justify-between items-center pt-1 pb-4">
            <span className="text-primary text-[13px] cursor-pointer hover:underline">
              {t('forgotPassword')}
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading
              ? '...'
              : t('managerLogin')}
          </button>
        </form>
      </div>
    </div>
  );
}
