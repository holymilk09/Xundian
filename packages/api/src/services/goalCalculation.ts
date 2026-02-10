import pool from '../db/pool.js';

export async function calculateGoalProgress(
  companyId: string,
  goals: Array<{ id: string; metric: string; target: number }>,
  employeeId: string,
  monthStart: string,
  monthEnd: string,
): Promise<Array<{ goal_id: string; metric: string; target: number; current: number; verified: number; flagged: number; percent: number }>> {
  const results = [];

  for (const goal of goals) {
    let current = 0;

    switch (goal.metric) {
      case 'visits_target': {
        const r = await pool.query(
          `SELECT COUNT(*) as cnt FROM visits WHERE company_id = $1 AND employee_id = $2 AND checked_in_at >= $3 AND checked_in_at < $4`,
          [companyId, employeeId, monthStart, monthEnd],
        );
        current = parseInt((r.rows[0] as Record<string, unknown>).cnt as string, 10);
        break;
      }
      case 'stores_target': {
        const r = await pool.query(
          `SELECT COUNT(DISTINCT store_id) as cnt FROM visits WHERE company_id = $1 AND employee_id = $2 AND checked_in_at >= $3 AND checked_in_at < $4`,
          [companyId, employeeId, monthStart, monthEnd],
        );
        current = parseInt((r.rows[0] as Record<string, unknown>).cnt as string, 10);
        break;
      }
      case 'coverage_percent': {
        const totalStores = await pool.query(
          `SELECT COUNT(*) as cnt FROM stores WHERE company_id = $1 AND (approval_status = 'approved' OR approval_status IS NULL)`,
          [companyId],
        );
        const visitedStores = await pool.query(
          `SELECT COUNT(DISTINCT store_id) as cnt FROM visits WHERE company_id = $1 AND employee_id = $2 AND checked_in_at >= $3 AND checked_in_at < $4`,
          [companyId, employeeId, monthStart, monthEnd],
        );
        const total = parseInt((totalStores.rows[0] as Record<string, unknown>).cnt as string, 10);
        const visited = parseInt((visitedStores.rows[0] as Record<string, unknown>).cnt as string, 10);
        current = total > 0 ? Math.round((visited / total) * 100) : 0;
        break;
      }
      case 'photos_target': {
        const r = await pool.query(
          `SELECT COUNT(*) as cnt FROM visit_photos vp JOIN visits v ON v.id = vp.visit_id WHERE v.company_id = $1 AND v.employee_id = $2 AND v.checked_in_at >= $3 AND v.checked_in_at < $4`,
          [companyId, employeeId, monthStart, monthEnd],
        );
        current = parseInt((r.rows[0] as Record<string, unknown>).cnt as string, 10);
        break;
      }
      case 'new_stores_target': {
        const r = await pool.query(
          `SELECT COUNT(*) as cnt FROM stores WHERE company_id = $1 AND discovered_by = $2 AND discovered_at >= $3 AND discovered_at < $4`,
          [companyId, employeeId, monthStart, monthEnd],
        );
        current = parseInt((r.rows[0] as Record<string, unknown>).cnt as string, 10);
        break;
      }
      case 'checklist_completion': {
        const r = await pool.query(
          `SELECT COALESCE(AVG(vcr.completion_rate), 0) as avg_rate FROM visit_checklist_results vcr JOIN visits v ON v.id = vcr.visit_id WHERE v.company_id = $1 AND v.employee_id = $2 AND v.checked_in_at >= $3 AND v.checked_in_at < $4`,
          [companyId, employeeId, monthStart, monthEnd],
        );
        current = Math.round(parseFloat((r.rows[0] as Record<string, unknown>).avg_rate as string));
        break;
      }
    }

    // Calculate verified/flagged
    const totalVisits = await pool.query(
      `SELECT COUNT(*) as cnt FROM visits WHERE company_id = $1 AND employee_id = $2 AND checked_in_at >= $3 AND checked_in_at < $4`,
      [companyId, employeeId, monthStart, monthEnd],
    );
    const flaggedVisits = await pool.query(
      `SELECT COUNT(DISTINCT v.id) as cnt FROM visits v JOIN visit_integrity_flags vif ON vif.visit_id = v.id WHERE v.company_id = $1 AND v.employee_id = $2 AND v.checked_in_at >= $3 AND v.checked_in_at < $4 AND NOT vif.resolved`,
      [companyId, employeeId, monthStart, monthEnd],
    );
    const totalCount = parseInt((totalVisits.rows[0] as Record<string, unknown>).cnt as string, 10);
    const flaggedCount = parseInt((flaggedVisits.rows[0] as Record<string, unknown>).cnt as string, 10);
    const verifiedCount = totalCount - flaggedCount;

    results.push({
      goal_id: goal.id,
      metric: goal.metric,
      target: goal.target,
      current,
      verified: verifiedCount,
      flagged: flaggedCount,
      percent: goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0,
    });
  }

  return results;
}

export async function refreshGoalProgress(companyId: string, goalId: string, employeeId: string): Promise<void> {
  const goalResult = await pool.query(
    `SELECT month, goals FROM monthly_goals WHERE id = $1 AND company_id = $2`,
    [goalId, companyId],
  );
  if (goalResult.rows.length === 0) return;

  const goal = goalResult.rows[0] as Record<string, unknown>;
  const month = new Date(goal.month as string);
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString();
  const goals = goal.goals as Array<{ id: string; metric: string; target: number }>;

  const progress = await calculateGoalProgress(companyId, goals, employeeId, monthStart, monthEnd);

  const totalVisits = await pool.query(
    `SELECT COUNT(*) as cnt FROM visits WHERE company_id = $1 AND employee_id = $2 AND checked_in_at >= $3 AND checked_in_at < $4`,
    [companyId, employeeId, monthStart, monthEnd],
  );
  const flaggedVisits = await pool.query(
    `SELECT COUNT(DISTINCT v.id) as cnt FROM visits v JOIN visit_integrity_flags vif ON vif.visit_id = v.id WHERE v.company_id = $1 AND v.employee_id = $2 AND v.checked_in_at >= $3 AND v.checked_in_at < $4 AND NOT vif.resolved`,
    [companyId, employeeId, monthStart, monthEnd],
  );
  const verifiedCount = parseInt((totalVisits.rows[0] as Record<string, unknown>).cnt as string, 10) - parseInt((flaggedVisits.rows[0] as Record<string, unknown>).cnt as string, 10);
  const flaggedCount = parseInt((flaggedVisits.rows[0] as Record<string, unknown>).cnt as string, 10);

  await pool.query(
    `INSERT INTO goal_progress (goal_id, employee_id, progress, verified_count, flagged_count, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (goal_id, employee_id) DO UPDATE SET progress = $3, verified_count = $4, flagged_count = $5, updated_at = NOW()`,
    [goalId, employeeId, JSON.stringify(progress), verifiedCount, flaggedCount],
  );
}

export async function refreshAllProgress(companyId: string, goalId: string): Promise<void> {
  const reps = await pool.query(
    `SELECT id FROM employees WHERE company_id = $1 AND is_active = true AND role = 'rep'`,
    [companyId],
  );
  for (const rep of reps.rows) {
    await refreshGoalProgress(companyId, goalId, (rep as Record<string, unknown>).id as string);
  }
}
