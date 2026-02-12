'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';

type StatusFilter = 'all' | 'active' | 'upcoming' | 'expired';

const TIERS = ['A', 'B', 'C'] as const;

const tierColors: Record<string, string> = {
  A: '#DC2626',
  B: '#F59E0B',
  C: '#6B7280',
};

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-warning/15', text: 'text-warning' },
  upcoming: { bg: 'bg-primary/15', text: 'text-primary' },
  expired: { bg: 'bg-slate-500/15', text: 'text-slate-400' },
};

export default function PromotionsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const user = getUser();
  const isManager =
    user?.role === 'admin' ||
    user?.role === 'area_manager' ||
    user?.role === 'regional_director';

  const { data: promos, loading, refetch } = useApi<any[]>('/promotions');
  const { data: products } = useApi<any[]>('/promotions/active'); // just for count
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    title_zh: '',
    description: '',
    description_zh: '',
    display_instructions: '',
    display_instructions_zh: '',
    product_id: '',
    target_tiers: ['A', 'B', 'C'] as string[],
    start_date: '',
    end_date: '',
  });

  const allPromos = promos || [];
  const filtered = filter === 'all' ? allPromos : allPromos.filter((p: any) => p.status === filter);

  const counts = {
    active: allPromos.filter((p: any) => p.status === 'active').length,
    upcoming: allPromos.filter((p: any) => p.status === 'upcoming').length,
    expired: allPromos.filter((p: any) => p.status === 'expired').length,
  };

  const resetForm = () => {
    setForm({
      title: '', title_zh: '', description: '', description_zh: '',
      display_instructions: '', display_instructions_zh: '',
      product_id: '', target_tiers: ['A', 'B', 'C'], start_date: '', end_date: '',
    });
    setEditingId(null);
  };

  const handleEdit = (promo: any) => {
    setForm({
      title: promo.title || '',
      title_zh: promo.title_zh || '',
      description: promo.description || '',
      description_zh: promo.description_zh || '',
      display_instructions: promo.display_instructions || '',
      display_instructions_zh: promo.display_instructions_zh || '',
      product_id: promo.product_id || '',
      target_tiers: promo.target_tiers || ['A', 'B', 'C'],
      start_date: promo.start_date?.split('T')[0] || '',
      end_date: promo.end_date?.split('T')[0] || '',
    });
    setEditingId(promo.id);
    setShowForm(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.title || !form.description || !form.start_date || !form.end_date) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const payload = {
        ...form,
        product_id: form.product_id || null,
      };
      if (editingId) {
        await api.put(`/promotions/${editingId}`, payload);
      } else {
        await api.post('/promotions', payload);
      }
      setSavedMsg(t('promotionSaved'));
      setShowForm(false);
      resetForm();
      refetch();
    } catch {
      // error silently
    } finally {
      setSaving(false);
    }
  }, [form, editingId, t, refetch]);

  const handleDeactivate = useCallback(async (id: string) => {
    try {
      await api.delete(`/promotions/${id}`);
      refetch();
    } catch {
      // error silently
    }
  }, [refetch]);

  const toggleTier = (tier: string) => {
    setForm(prev => ({
      ...prev,
      target_tiers: prev.target_tiers.includes(tier)
        ? prev.target_tiers.filter(t => t !== tier)
        : [...prev.target_tiers, tier],
    }));
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('promotions')}</h1>
        </div>
        <div className="flex gap-2">
          {isManager && !showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-warning hover:bg-warning/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {t('createPromotion')}
            </button>
          )}
        </div>
      </div>

      {savedMsg && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-success/15 text-success text-sm">
          {savedMsg}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: t('activePromotions'), count: counts.active, color: '#F59E0B' },
          { label: t('upcomingPromotions'), count: counts.upcoming, color: '#3B82F6' },
          { label: t('expiredPromotions'), count: counts.expired, color: '#6B7280' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl text-center py-4 px-2"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${s.color}22`,
            }}
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-[11px] text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'upcoming', 'expired'] as StatusFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-white/[0.1] text-white'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            {f === 'all' ? t('allPromotions') :
             f === 'active' ? t('activePromotions') :
             f === 'upcoming' ? t('upcomingPromotions') :
             t('expiredPromotions')}
          </button>
        ))}
      </div>

      {/* Create/Edit Form (Manager only) */}
      {showForm && isManager && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-6">
          <h2 className="text-white text-lg font-semibold mb-4">
            {editingId ? t('editPromotion') : t('createPromotion')}
          </h2>

          <div className="space-y-3">
            {/* Title */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={`${t('promotionTitle')} (EN)`}
                className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={form.title_zh}
                onChange={e => setForm(f => ({ ...f, title_zh: e.target.value }))}
                placeholder={`${t('promotionTitle')} (中文)`}
                className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {/* Description */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={`${t('promotionDescription')} (EN)`}
                className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={form.description_zh}
                onChange={e => setForm(f => ({ ...f, description_zh: e.target.value }))}
                placeholder={`${t('promotionDescription')} (中文)`}
                className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {/* Display Instructions */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.display_instructions}
                onChange={e => setForm(f => ({ ...f, display_instructions: e.target.value }))}
                placeholder={`${t('displayInstructions')} (EN)`}
                className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={form.display_instructions_zh}
                onChange={e => setForm(f => ({ ...f, display_instructions_zh: e.target.value }))}
                placeholder={`${t('displayInstructions')} (中文)`}
                className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {/* Target Tiers */}
            <div>
              <label className="text-slate-400 text-xs mb-2 block">{t('targetTiers')}</label>
              <div className="flex gap-2">
                {TIERS.map(tier => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => toggleTier(tier)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      form.target_tiers.includes(tier)
                        ? 'text-white'
                        : 'bg-white/[0.04] text-slate-500 border border-white/[0.08]'
                    }`}
                    style={form.target_tiers.includes(tier) ? {
                      background: `${tierColors[tier]}22`,
                      color: tierColors[tier],
                      border: `1px solid ${tierColors[tier]}44`,
                    } : undefined}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t('startDate')}</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">{t('endDate')}</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4 pt-3 border-t border-white/[0.06]">
            <button
              onClick={handleSave}
              disabled={saving || !form.title || !form.description || !form.start_date || !form.end_date}
              className="bg-warning hover:bg-warning/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? t('saving') : t('savePromotion')}
            </button>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Promotions List */}
      {loading && <p className="text-slate-400 text-sm">Loading...</p>}
      {!loading && filtered.length === 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
          <p className="text-muted">{t('noPromotions')}</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((promo: any) => {
          const sc = statusColors[promo.status as string] ?? { bg: 'bg-slate-500/15', text: 'text-slate-400' };
          return (
            <div
              key={promo.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5"
            >
              {/* Top row: status + tiers + days */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge-pill ${sc.bg} ${sc.text}`}>
                  {promo.status === 'active' ? t('activePromotions') :
                   promo.status === 'upcoming' ? t('upcoming') :
                   t('expired')}
                </span>
                {promo.target_tiers?.map((tier: string) => (
                  <span
                    key={tier}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-[5px]"
                    style={{
                      background: `${tierColors[tier] || '#6B7280'}22`,
                      color: tierColors[tier] || '#6B7280',
                    }}
                  >
                    {tier}
                  </span>
                ))}
                {promo.product_name ? (
                  <span className="text-muted text-xs ml-1">
                    {lang === 'zh' ? promo.product_name_zh || promo.product_name : promo.product_name}
                  </span>
                ) : (
                  <span className="text-muted text-xs ml-1">{t('promoCompanyWide')}</span>
                )}
                <span className="ml-auto text-slate-400 text-xs">
                  {promo.start_date?.split('T')[0]} → {promo.end_date?.split('T')[0]}
                </span>
                {promo.status !== 'expired' && (
                  <span className="text-warning text-xs font-medium">
                    {promo.days_remaining} {t('daysLeft')}
                  </span>
                )}
              </div>

              {/* Title + description */}
              <h3 className="text-white text-base font-semibold">
                {lang === 'zh' ? promo.title_zh || promo.title : promo.title}
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                {lang === 'zh' ? promo.description_zh || promo.description : promo.description}
              </p>

              {/* Display instructions */}
              {(promo.display_instructions || promo.display_instructions_zh) && (
                <div className="mt-3 rounded-lg bg-warning/[0.06] border border-warning/[0.12] p-3">
                  <div className="text-warning text-xs font-semibold mb-1">{t('displayInstructions')}</div>
                  <div className="text-slate-300 text-sm">
                    {lang === 'zh'
                      ? promo.display_instructions_zh || promo.display_instructions
                      : promo.display_instructions}
                  </div>
                </div>
              )}

              {/* Actions (manager) */}
              {isManager && promo.status !== 'expired' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleEdit(promo)}
                    className="text-primary text-xs hover:text-primary/80 transition-colors"
                  >
                    {t('editPromotion')}
                  </button>
                  <button
                    onClick={() => handleDeactivate(promo.id)}
                    className="text-danger/60 text-xs hover:text-danger transition-colors"
                  >
                    {t('deactivate')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
