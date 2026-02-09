'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EmployeeRole } from '@xundian/shared';

interface MockEmployee {
  id: string;
  name: string;
  name_zh: string;
  phone: string;
  role: EmployeeRole;
  territory: string;
  territory_zh: string;
  is_active: boolean;
  visitsThisWeek: number;
}

const mockEmployees: MockEmployee[] = [
  { id: '1', name: 'Zhang Wei', name_zh: '张伟', phone: '138-0000-1001', role: 'rep', territory: 'Pudong District A', territory_zh: '浦东A区', is_active: true, visitsThisWeek: 14 },
  { id: '2', name: 'Li Na', name_zh: '李娜', phone: '138-0000-1002', role: 'rep', territory: 'Pudong District B', territory_zh: '浦东B区', is_active: true, visitsThisWeek: 17 },
  { id: '3', name: 'Wang Jun', name_zh: '王军', phone: '138-0000-1003', role: 'rep', territory: 'Puxi District A', territory_zh: '浦西A区', is_active: true, visitsThisWeek: 11 },
  { id: '4', name: 'Chen Mei', name_zh: '陈梅', phone: '138-0000-1004', role: 'rep', territory: 'Puxi District B', territory_zh: '浦西B区', is_active: true, visitsThisWeek: 16 },
  { id: '5', name: 'Liu Fang', name_zh: '刘芳', phone: '138-0000-1005', role: 'area_manager', territory: 'Pudong', territory_zh: '浦东', is_active: true, visitsThisWeek: 6 },
  { id: '6', name: 'Zhao Qiang', name_zh: '赵强', phone: '138-0000-1006', role: 'rep', territory: 'Minhang District', territory_zh: '闵行区', is_active: false, visitsThisWeek: 0 },
];

export default function EmployeesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'zh';
  const [showForm, setShowForm] = useState(false);

  const roleLabels: Record<EmployeeRole, string> = {
    rep: t('rep'),
    area_manager: t('area_manager'),
    regional_director: t('regional_director'),
    admin: t('admin'),
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
            <input placeholder={t('name')} className="input-field" />
            <input placeholder={t('phone')} className="input-field" />
            <select className="input-field">
              <option value="rep">{t('rep')}</option>
              <option value="area_manager">{t('area_manager')}</option>
              <option value="regional_director">{t('regional_director')}</option>
              <option value="admin">{t('admin')}</option>
            </select>
          </div>
          <div className="mt-4 flex gap-3">
            <button className="btn-primary text-sm py-2">{t('saveChanges')}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm py-2">
              {lang === 'en' ? 'Cancel' : '取消'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
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
            {mockEmployees.map((emp) => (
              <tr
                key={emp.id}
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 text-white font-medium">
                  {lang === 'zh' ? emp.name_zh : emp.name}
                </td>
                <td className="px-4 py-3 text-slate-300 font-mono text-xs">{emp.phone}</td>
                <td className="px-4 py-3">
                  <span className="badge-pill bg-primary/15 text-primary">
                    {roleLabels[emp.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {lang === 'zh' ? emp.territory_zh : emp.territory}
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
                <td className="px-4 py-3 text-white font-medium">{emp.visitsThisWeek}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
