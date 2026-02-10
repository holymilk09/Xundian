'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/lib/hooks';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';

const METRICS = [
  'visits_target',
  'stores_target',
  'coverage_percent',
  'photos_target',
  'new_stores_target',
  'checklist_completion',
] as const;

type Metric = (typeof METRICS)[number];

interface GoalDraft {
  metric: Metric;
  target: number;
  label: string;
}

interface GoalProgress {
  goal_id: string;
  metric: Metric;
  target: number;
  label: string;
  current: number;
  percent: number;
}

interface RepProgress {
  employee_id: string;
  employee_name: string;
  goals: GoalProgress[];
  avg_completion: number;
}

interface LeaderboardEntry {
  rank: number;
  employee_id: string;
  employee_name: string;
  avg_completion: number;
  verified_count: number;
  flagged_count: number;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getDaysRemaining(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(0, lastDay.getDate() - now.getDate());
}

export default function GoalsPage() {
  const { t } = useTranslation();
  const user = getUser();
  const isManager =
    user?.role === 'admin' ||
    user?.role === 'area_manager' ||
    user?.role === 'regional_director';

  const { data: progressData, loading: progressLoading, refetch: refetchProgress } =
    useApi<RepProgress[]>('/goals/progress/current');
  const { data: leaderboardData, loading: leaderboardLoading, refetch: refetchLeaderboard } =
    useApi<LeaderboardEntry[]>('/goals/leaderboard');

  const [showForm, setShowForm] = useState(false);
  const [goals, setGoals] = useState<GoalDraft[]>([
    { metric: 'visits_target', target: 0, label: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const addGoal = () => {
    setGoals([...goals, { metric: 'visits_target', target: 0, label: '' }]);
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, field: keyof GoalDraft, value: string | number) => {
    const updated = [...goals];
    const goal = updated[index];
    if (goal) {
      updated[index] = { ...goal, [field]: value };
    }
    setGoals(updated);
  };

  const handleSave = useCallback(async () => {
    if (goals.length === 0) return;
    setSaving(true);
    setSavedMsg('');
    try {
      await api.post('/goals', {
        month: getCurrentMonth(),
        goals: goals.map((g) => ({ metric: g.metric, target: g.target, label: g.label })),
      });
      setSavedMsg(t('goalsSaved'));
      setShowForm(false);
      refetchProgress();
      refetchLeaderboard();
    } catch {
      // error handled silently
    } finally {
      setSaving(false);
    }
  }, [goals, t, refetchProgress, refetchLeaderboard]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await api.post('/goals/progress/refresh');
      refetchProgress();
      refetchLeaderboard();
    } catch {
      // error handled silently
    } finally {
      setRefreshing(false);
    }
  }, [refetchProgress, refetchLeaderboard]);

  const daysLeft = getDaysRemaining();
  const allProgress = progressData || [];
  const leaderboard = leaderboardData || [];

  // For rep view: find own progress
  const myProgress = user
    ? allProgress.find((p) => p.employee_id === user.id)
    : null;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isManager ? t('monthlyGoals') : t('myGoals')}
          </h1>
          {isManager && (
            <p className="text-muted text-sm mt-1">{t('monthlyGoalsSubtitle')}</p>
          )}
        </div>
        <div className="flex gap-2">
          {isManager && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {t('createGoals')}
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {refreshing ? t('refreshing') : t('refreshProgress')}
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-success/15 text-success text-sm">
          {savedMsg}
        </div>
      )}

      {/* Goal Creation/Edit Form (Manager only) */}
      {showForm && isManager && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-6">
          <h2 className="text-white text-lg font-semibold mb-4">{t('createGoals')}</h2>
          <p className="text-muted text-xs mb-4">
            {getCurrentMonth()}
          </p>

          <div className="space-y-3">
            {goals.map((goal, index) => (
              <div key={index} className="flex items-center gap-3 bg-white/[0.03] rounded-lg p-3">
                <span className="text-slate-500 text-xs w-5 shrink-0">{index + 1}</span>
                <select
                  value={goal.metric}
                  onChange={(e) => updateGoal(index, 'metric', e.target.value)}
                  className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary w-48"
                >
                  {METRICS.map((m) => (
                    <option key={m} value={m}>
                      {t(m)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={goal.target || ''}
                  onChange={(e) => updateGoal(index, 'target', Number(e.target.value))}
                  placeholder={t('goalTarget')}
                  min={0}
                  className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary w-24"
                />
                <input
                  type="text"
                  value={goal.label}
                  onChange={(e) => updateGoal(index, 'label', e.target.value)}
                  placeholder={t('goalLabel')}
                  className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeGoal(index)}
                  className="text-danger/60 hover:text-danger text-sm px-2 shrink-0"
                >
                  {t('removeGoal')}
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addGoal}
            className="mt-3 px-3 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-slate-400 text-xs hover:border-primary hover:text-primary transition-colors"
          >
            + {t('addGoal')}
          </button>

          <div className="flex gap-3 mt-4 pt-3 border-t border-white/[0.06]">
            <button
              onClick={handleSave}
              disabled={saving || goals.length === 0}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? t('savingGoals') : t('saveGoals')}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Rep View: My Goal Progress Cards */}
      {!isManager && (
        <div className="mb-8">
          <h2 className="text-white text-lg font-semibold mb-4">{t('goalProgress')}</h2>
          {progressLoading && <p className="text-slate-400 text-sm">Loading...</p>}
          {!progressLoading && (!myProgress || myProgress.goals.length === 0) && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
              <p className="text-muted">{t('noGoalsYet')}</p>
            </div>
          )}
          {myProgress && myProgress.goals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myProgress.goals.map((goal) => (
                <div
                  key={goal.goal_id}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">{t(goal.metric)}</span>
                    <span className="text-slate-400 text-xs">
                      {daysLeft} {t('daysRemaining')}
                    </span>
                  </div>
                  {goal.label && (
                    <p className="text-muted text-xs mb-3">{goal.label}</p>
                  )}
                  <div className="bg-white/[0.06] rounded-full h-2 mb-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(100, goal.percent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 text-xs">
                      {goal.current} / {goal.target} {t('ofTarget')}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        goal.percent >= 100
                          ? 'text-success'
                          : goal.percent >= 50
                            ? 'text-primary'
                            : 'text-warning'
                      }`}
                    >
                      {Math.round(goal.percent)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manager View: Team Progress Table */}
      {isManager && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-6">
          <h2 className="text-white text-lg font-semibold mb-4">{t('teamProgress')}</h2>
          {progressLoading && <p className="text-slate-400 text-sm">Loading...</p>}
          {!progressLoading && allProgress.length === 0 && (
            <p className="text-muted text-sm text-center py-6">{t('noGoalsSet')}</p>
          )}
          {!progressLoading && allProgress.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-slate-400 text-xs font-medium py-3 pr-4">
                      {t('repName')}
                    </th>
                    {allProgress[0]?.goals.map((g) => (
                      <th
                        key={g.goal_id}
                        className="text-left text-slate-400 text-xs font-medium py-3 pr-4"
                      >
                        {t(g.metric)}
                      </th>
                    ))}
                    <th className="text-right text-slate-400 text-xs font-medium py-3">
                      {t('avgCompletion')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allProgress.map((rep) => (
                    <tr key={rep.employee_id} className="border-b border-white/[0.06]">
                      <td className="text-white text-sm py-3 pr-4">{rep.employee_name}</td>
                      {rep.goals.map((g) => (
                        <td key={g.goal_id} className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="bg-white/[0.06] rounded-full h-2 flex-1 min-w-[60px]">
                              <div
                                className="bg-primary rounded-full h-2 transition-all"
                                style={{ width: `${Math.min(100, g.percent)}%` }}
                              />
                            </div>
                            <span className="text-slate-300 text-xs w-12 text-right">
                              {Math.round(g.percent)}%
                            </span>
                          </div>
                          <span className="text-slate-500 text-[10px]">
                            {g.current}/{g.target}
                          </span>
                        </td>
                      ))}
                      <td className="text-right py-3">
                        <span
                          className={`text-sm font-bold ${
                            rep.avg_completion >= 100
                              ? 'text-success'
                              : rep.avg_completion >= 50
                                ? 'text-primary'
                                : 'text-warning'
                          }`}
                        >
                          {Math.round(rep.avg_completion)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
        <h2 className="text-white text-lg font-semibold mb-4">{t('leaderboard')}</h2>
        {leaderboardLoading && <p className="text-slate-400 text-sm">Loading...</p>}
        {!leaderboardLoading && leaderboard.length === 0 && (
          <p className="text-muted text-sm text-center py-6">{t('noGoalsSet')}</p>
        )}
        {!leaderboardLoading && leaderboard.length > 0 && (
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isMe = user?.id === entry.employee_id;
              return (
                <div
                  key={entry.employee_id}
                  className={`flex items-center gap-4 py-3 px-4 rounded-lg ${
                    isMe
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-white/[0.03] border border-white/[0.04]'
                  }`}
                >
                  <span
                    className={`text-lg font-bold w-8 text-center ${
                      entry.rank === 1
                        ? 'text-warning'
                        : entry.rank === 2
                          ? 'text-slate-300'
                          : entry.rank === 3
                            ? 'text-amber-700'
                            : 'text-slate-500'
                    }`}
                  >
                    #{entry.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm font-medium truncate">
                      {entry.employee_name}
                      {isMe && (
                        <span className="text-primary text-xs ml-2">({t('profile')})</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-success/15 text-success">
                      {entry.verified_count} {t('verified')}
                    </span>
                    {entry.flagged_count > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-danger/15 text-danger">
                        {entry.flagged_count} {t('flagged')}
                      </span>
                    )}
                    <span
                      className={`text-sm font-bold w-14 text-right ${
                        entry.avg_completion >= 100
                          ? 'text-success'
                          : entry.avg_completion >= 50
                            ? 'text-primary'
                            : 'text-warning'
                      }`}
                    >
                      {Math.round(entry.avg_completion)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
