'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';

interface ChecklistItem {
  id: string;
  label: string;
  label_zh?: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface ChecklistTemplate {
  id: string;
  name: string;
  name_zh?: string;
  items: ChecklistItem[];
  assigned_tiers: string[];
  is_active: boolean;
  creator_name?: string;
  created_at: string;
}

const ITEM_TYPES = ['photo', 'yes_no', 'numeric', 'text', 'dropdown'];
const TIERS = ['A', 'B', 'C'];

function generateItemId() {
  return `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function ChecklistsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const user = getUser();
  const isManager = user?.role !== 'rep';
  const { data: templates, loading, error, refetch } = useApi<ChecklistTemplate[]>('/checklists/templates');

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formNameZh, setFormNameZh] = useState('');
  const [formTiers, setFormTiers] = useState<string[]>(['A', 'B', 'C']);
  const [formItems, setFormItems] = useState<ChecklistItem[]>([]);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormName('');
    setFormNameZh('');
    setFormTiers(['A', 'B', 'C']);
    setFormItems([]);
    setEditId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (tmpl: ChecklistTemplate) => {
    setFormName(tmpl.name);
    setFormNameZh(tmpl.name_zh || '');
    setFormTiers(tmpl.assigned_tiers);
    setFormItems(tmpl.items);
    setEditId(tmpl.id);
    setShowForm(true);
  };

  const addItem = () => {
    setFormItems([
      ...formItems,
      { id: generateItemId(), label: '', type: 'yes_no', required: false },
    ]);
  };

  const removeItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ChecklistItem, value: unknown) => {
    const updated = [...formItems];
    const item = updated[index];
    if (item) {
      updated[index] = { ...item, [field]: value };
    }
    setFormItems(updated);
  };

  const toggleTier = (tier: string) => {
    setFormTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier],
    );
  };

  const handleSave = useCallback(async () => {
    if (!formName || formItems.length === 0 || formTiers.length === 0) return;
    setSaving(true);
    try {
      const body = {
        name: formName,
        name_zh: formNameZh || undefined,
        items: formItems,
        assigned_tiers: formTiers,
      };
      if (editId) {
        await api.put(`/checklists/templates/${editId}`, body);
      } else {
        await api.post('/checklists/templates', body);
      }
      resetForm();
      refetch();
    } catch {
      // error
    } finally {
      setSaving(false);
    }
  }, [formName, formNameZh, formItems, formTiers, editId, refetch]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/checklists/templates/${id}`);
      refetch();
    } catch {
      // error
    }
  }, [refetch]);

  const handleToggleActive = useCallback(async (id: string, currentActive: boolean) => {
    try {
      await api.put(`/checklists/templates/${id}`, { is_active: !currentActive });
      refetch();
    } catch {
      // error
    }
  }, [refetch]);

  const allTemplates = templates || [];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('checklistTemplates')}</h1>
          <p className="text-muted text-sm mt-1">{t('checklistSubtitle')}</p>
        </div>
        {isManager && !showForm && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t('createChecklist')}
          </button>
        )}
      </div>

      {loading && <p className="text-slate-400">Loading...</p>}
      {error && <p className="text-danger">{error}</p>}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="glass-card p-5 mb-6">
          <h2 className="text-white font-semibold mb-4">
            {editId ? t('editChecklist') : t('createChecklist')}
          </h2>

          <div className="space-y-4">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">{t('templateName')} (EN) *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1.5">{t('templateName')} (中文)</label>
                <input
                  type="text"
                  value={formNameZh}
                  onChange={(e) => setFormNameZh(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Tier selection */}
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">{t('assignedTiers')} *</label>
              <div className="flex gap-2">
                {TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => toggleTier(tier)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formTiers.includes(tier)
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.08]'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Checklist items */}
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">{t('checklistItems')} *</label>
              <div className="space-y-2">
                {formItems.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 bg-white/[0.03] rounded-lg p-2">
                    <span className="text-slate-500 text-xs w-5">{index + 1}</span>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateItem(index, 'label', e.target.value)}
                      placeholder={t('itemLabel')}
                      className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-primary"
                    />
                    <select
                      value={item.type}
                      onChange={(e) => updateItem(index, 'type', e.target.value)}
                      className="bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-primary w-24"
                    >
                      {ITEM_TYPES.map((type) => (
                        <option key={type} value={type}>{t(type === 'yes_no' ? 'yesNo' : type)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => updateItem(index, 'required', !item.required)}
                      className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                        item.required
                          ? 'bg-primary/20 text-primary'
                          : 'bg-white/[0.04] text-slate-400'
                      }`}
                    >
                      {item.required ? t('required') : t('optional')}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-danger/60 hover:text-danger text-xs px-1"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addItem}
                className="mt-2 px-3 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-slate-400 text-xs hover:border-primary hover:text-primary transition-colors"
              >
                + {t('addItem')}
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !formName || formItems.length === 0 || formTiers.length === 0}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? t('saving') : t('saveChanges')}
              </button>
              <button
                onClick={resetForm}
                className="px-5 py-2 rounded-lg text-slate-400 text-sm hover:text-white transition-colors"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template list */}
      {!loading && !error && allTemplates.length === 0 && !showForm && (
        <div className="glass-card p-8 text-center">
          <p className="text-muted">{t('noChecklists')}</p>
        </div>
      )}

      {!loading && !error && allTemplates.length > 0 && (
        <div className="space-y-3">
          {allTemplates.map((tmpl) => (
            <div key={tmpl.id} className="glass-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-sm">
                      {lang === 'zh' ? tmpl.name_zh || tmpl.name : tmpl.name}
                    </h3>
                    {!tmpl.is_active && (
                      <span className="badge-pill bg-slate-500/15 text-slate-500">{t('inactive')}</span>
                    )}
                  </div>
                  <p className="text-muted text-xs mt-1">
                    {tmpl.items.length} {t('checklistItems').toLowerCase()} &middot;{' '}
                    {t('assignedTiers')}: {tmpl.assigned_tiers.join(', ')}
                    {tmpl.creator_name && ` · ${tmpl.creator_name}`}
                  </p>
                </div>

                {isManager && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(tmpl.id, tmpl.is_active)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        tmpl.is_active
                          ? 'text-warning hover:bg-warning/10'
                          : 'text-success hover:bg-success/10'
                      }`}
                    >
                      {tmpl.is_active ? t('inactive') : t('active')}
                    </button>
                    <button
                      onClick={() => openEdit(tmpl)}
                      className="px-2 py-1 rounded text-xs text-primary hover:bg-primary/10 transition-colors"
                    >
                      {t('editChecklist')}
                    </button>
                    <button
                      onClick={() => handleDelete(tmpl.id)}
                      className="px-2 py-1 rounded text-xs text-danger/60 hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>

              {/* Items preview */}
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex flex-wrap gap-2">
                  {tmpl.items.map((item) => (
                    <span
                      key={item.id}
                      className={`px-2 py-1 rounded text-[11px] ${
                        item.required
                          ? 'bg-primary/10 text-primary'
                          : 'bg-white/[0.04] text-slate-400'
                      }`}
                    >
                      {lang === 'zh' ? item.label_zh || item.label : item.label}
                      <span className="ml-1 opacity-60">
                        ({t(item.type === 'yes_no' ? 'yesNo' : item.type)})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
