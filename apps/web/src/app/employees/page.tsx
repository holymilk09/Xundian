'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EmployeeRole } from '@xundian/shared';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';

export default function EmployeesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<EmployeeRole>('rep');
  const [submitting, setSubmitting] = useState(false);

  const { data: employees, loading, error, refetch } = useApi<any[]>('/company/employees');

  const roleLabels: Record<EmployeeRole, string> = {
    rep: t('rep'),
    area_manager: t('area_manager'),
    regional_director: t('regional_director'),
    admin: t('admin'),
  };

  const handleAddEmployee = async () => {
    if (!formName || !formPhone) return;
    setSubmitting(true);
    try {
      await api.post('/company/employees', {
        name: formName,
        phone: formPhone,
        password: 'demo123',
        role: formRole,
      });
      setFormName('');
      setFormPhone('');
      setFormRole('rep');
      setShowForm(false);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">{t('employees')}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm py-2.5"
        >
          + {t('addEmployee')}
        </button>
      </div>

      {/* Add Employee Form */}
      {showForm && (
        <div className="glass-card p-6 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <input
              placeholder={t('name')}
              className="input-field"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
            <input
              placeholder={t('phone')}
              className="input-field"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
            <select
              className="input-field"
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as EmployeeRole)}
            >
              <option value="rep">{t('rep')}</option>
              <option value="area_manager">{t('area_manager')}</option>
              <option value="regional_director">{t('regional_director')}</option>
              <option value="admin">{t('admin')}</option>
            </select>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              className="btn-primary text-sm py-2"
              onClick={handleAddEmployee}
              disabled={submitting}
            >
              {submitting ? '...' : t('saveChanges')}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm py-2">
              {lang === 'en' ? 'Cancel' : '取消'}
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-slate-400">Loading...</p>}
      {error && <p className="text-danger">{error}</p>}

      {/* Table */}
      {!loading && !error && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-slate-400 font-medium px-4 py-3">{t('name')}</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">{t('phone')}</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">{t('role')}</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">{t('territory')}</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">{t('status')}</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">{t('visitsThisWeek')}</th>
              </tr>
            </thead>
            <tbody>
              {(employees || []).map((emp: any) => (
                <tr
                  key={emp.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-white font-medium">{emp.name}</td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">{emp.phone}</td>
                  <td className="px-4 py-3">
                    <span className="badge-pill bg-primary/15 text-primary">
                      {roleLabels[emp.role as EmployeeRole] || emp.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {emp.territory_id || '--'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge-pill ${
                        emp.is_active ? 'bg-success/15 text-success' : 'bg-slate-500/15 text-slate-500'
                      }`}
                    >
                      {emp.is_active ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{emp.visits_this_week ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
