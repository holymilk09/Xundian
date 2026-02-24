import pool from '../db/pool.js';

export async function calculateGoalProgress(
  companyId: string,
  goals: Array<{ id: string; metric: string; target: number }>,
  employeeId: string,
  monthStart: string,
  monthEnd: string,
): Promise<{ progress: Array<{ goal_id: string; metric: string; target: number; current: number; verified: number; flagged: number; percent: number }>; verifiedCount: number; flaggedCount: number }> {
  // Hoist verified/flagged queries before the loop — same for every goal
  const [totalVisits, flaggedVisits] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) as cnt FROM visits WHERE company_id = $1 AND employee_id = $2 AND checked_in_at >= $3 AND checked_in_at < $4`,
      [companyId, employeeId, monthStart, monthEnd],
    ),
    pool.query(
      `SELECT COUNT(DISTINCT v.id) as cnt FROM visits v JOIN visit_integrity_flags vif ON vif.visit_id = v.id WHERE v.company_id = $1 AND v.employee_id = $2 AND v.checked_in_at >= $3 AND v.checked_in_at < $4 AND NOT vif.resolved`,
      [companyId, employeeId, monthStart, monthEnd],
    ),
  ]);
  const totalCount = parseInt((totalVisits.rows[0] as Record<string, unknown>).cnt as string, 10);
  const flaggedCount = parseInt((flaggedVisits.rows[0] as Record<string, unknown>).cnt as string, 10);
  const verifiedCount = totalCount - flaggedCount;

  // Determine which metrics are needed to avoid unnecessary queries
  const metrics = new Set(goals.map((g) => g.metric));
  const needVisitAgg = metrics.has('visits_target') || metrics.has('stores_target') || metrics.has('coverage_percent');
  const needPhotos = metrics.has('photos_target');
  const needNewStores = metrics.has('new_stores_target');
  const needChecklist = metrics.has('checklist_completion');
  const needTotalStores = metrics.has('coverage_percent');

  // Run all independent queries in parallel
  const [visitAgg, photosAgg, newStoresAgg, checklistAgg, totalStoresAgg] = await Promise.all([
    needVisitAgg
      ? pool.query(
          `SELECT COUNT(*) as visit_count, COUNT(DISTINCT store_id) as store_count
           FROM visits WHERE company_id = $1 AND employee_id = $2 AND checked_in_at >= $3 AND checked_in_at < $4`,
          [companyId, employeeId, monthStart, monthEnd],
        )
      : null,
    needPhotos
      ? pool.query(
          `SELECT COUNT(*) as cnt FROM visit_photos vp JOIN visits v ON v.id = vp.visit_id WHERE v.company_id = $1 AND v.employee_id = $2 AND v.checked_in_at >= $3 AND v.checked_in_at < $4`,
          [companyId, employeeId, monthStart, monthEnd],
        )
      : null,
    needNewStores
      ? pool.query(
          `SELECT COUNT(*) as cnt FROM stores WHERE company_id = $1 AND discovered_by = $2 AND discovered_at >= $3 AND discovered_at < $4`,
          [companyId, employeeId, monthStart, monthEnd],
        )
      : null,
    needChecklist
      ? pool.query(
          `SELECT COALESCE(AVG(vcr.completion_rate), 0) as avg_rate FROM visit_checklist_results vcr JOIN visits v ON v.id = vcr.visit_id WHERE v.company_id = $1 AND v.employee_id = $2 AND v.checked_in_at >= $3 AND v.checked_in_at < $4`,
          [companyId, employeeId, monthStart, monthEnd],
        )
      : null,
    needTotalStores
      ? pool.query(
          `SELECT COUNT(*) as cnt FROM stores WHERE company_id = $1 AND (approval_status = 'approved' OR approval_status IS NULL)`,
          [companyId],
        )
      : null,
  ]);

  // Extract values from aggregated results
  const visitCount = visitAgg ? parseInt((visitAgg.rows[0] as Record<string, unknown>).visit_count as string, 10) : 0;
  const storeCount = visitAgg ? parseInt((visitAgg.rows[0] as Record<string, unknown>).store_count as string, 10) : 0;
  const photoCount = photosAgg ? parseInt((photosAgg.rows[0] as Record<string, unknown>).cnt as string, 10) : 0;
  const newStoreCount = newStoresAgg ? parseInt((newStoresAgg.rows[0] as Record<string, unknown>).cnt as string, 10) : 0;
  const avgChecklistRate = checklistAgg ? Math.round(parseFloat((checklistAgg.rows[0] as Record<string, unknown>).avg_rate as string)) : 0;
  const totalStoreCount = totalStoresAgg ? parseInt((totalStoresAgg.rows[0] as Record<string, unknown>).cnt as string, 10) : 0;

  const results = [];
  for (const goal of goals) {
    let current = 0;

    switch (goal.metric) {
      case 'visits_target':
        current = visitCount;
        break;
      case 'stores_target':
        current = storeCount;
        break;
      case 'coverage_percent':
        current = totalStoreCount > 0 ? Math.round((storeCount / totalStoreCount) * 100) : 0;
        break;
      case 'photos_target':
        current = photoCount;
        break;
      case 'new_stores_target':
        current = newStoreCount;
        break;
      case 'checklist_completion':
        current = avgChecklistRate;
        break;
    }

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

  return { progress: results, verifiedCount, flaggedCount };
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

  // calculateGoalProgress now returns verified/flagged counts — no need to re-query
  const { progress, verifiedCount, flaggedCount } = await calculateGoalProgress(companyId, goals, employeeId, monthStart, monthEnd);

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
  await Promise.all(
    reps.rows.map((rep) => refreshGoalProgress(companyId, goalId, (rep as Record<string, unknown>).id as string)),
  );
}
