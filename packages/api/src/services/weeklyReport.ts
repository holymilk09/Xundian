import pool from '../db/pool.js';

export async function generateWeeklyReport(companyId: string, weekStart: string, weekEnd: string) {
  // Summary
  const summaryResult = await pool.query(
    `SELECT
       COUNT(*) as total_visits,
       COUNT(DISTINCT v.store_id) as unique_stores,
       COUNT(*) FILTER (WHERE v.stock_status = 'out_of_stock') as oos_incidents
     FROM visits v
     WHERE v.company_id = $1 AND v.checked_in_at >= $2 AND v.checked_in_at < $3`,
    [companyId, weekStart, weekEnd],
  );
  const s = summaryResult.rows[0] as Record<string, unknown>;

  const totalStores = await pool.query(
    `SELECT COUNT(*) as cnt FROM stores WHERE company_id = $1 AND (approval_status = 'approved' OR approval_status IS NULL)`,
    [companyId],
  );
  const totalStoreCount = parseInt((totalStores.rows[0] as Record<string, unknown>).cnt as string, 10);
  const uniqueVisited = parseInt(s.unique_stores as string, 10);
  const coveragePercent = totalStoreCount > 0 ? Math.round((uniqueVisited / totalStoreCount) * 100) : 0;

  const photosResult = await pool.query(
    `SELECT COUNT(*) as cnt FROM visit_photos vp JOIN visits v ON v.id = vp.visit_id WHERE v.company_id = $1 AND v.checked_in_at >= $2 AND v.checked_in_at < $3`,
    [companyId, weekStart, weekEnd],
  );

  const flaggedResult = await pool.query(
    `SELECT COUNT(DISTINCT v.id) as cnt FROM visits v JOIN visit_integrity_flags vif ON vif.visit_id = v.id WHERE v.company_id = $1 AND v.checked_in_at >= $2 AND v.checked_in_at < $3 AND NOT vif.resolved`,
    [companyId, weekStart, weekEnd],
  );

  const newStoresResult = await pool.query(
    `SELECT COUNT(*) as cnt FROM stores WHERE company_id = $1 AND discovered_at >= $2 AND discovered_at < $3`,
    [companyId, weekStart, weekEnd],
  );

  // Avg SoS from AI analysis
  const sosResult = await pool.query(
    `SELECT AVG((vp.ai_analysis->>'share_of_shelf_percent')::numeric) as avg_sos
     FROM visit_photos vp JOIN visits v ON v.id = vp.visit_id
     WHERE v.company_id = $1 AND v.checked_in_at >= $2 AND v.checked_in_at < $3 AND vp.ai_analysis IS NOT NULL`,
    [companyId, weekStart, weekEnd],
  );

  const summary = {
    week_start: weekStart,
    week_end: weekEnd,
    total_visits: parseInt(s.total_visits as string, 10),
    unique_stores_visited: uniqueVisited,
    coverage_percent: coveragePercent,
    avg_sos: sosResult.rows[0] ? parseFloat((sosResult.rows[0] as Record<string, unknown>).avg_sos as string) || null : null,
    oos_incidents: parseInt(s.oos_incidents as string, 10),
    new_stores_discovered: parseInt((newStoresResult.rows[0] as Record<string, unknown>).cnt as string, 10),
    flagged_visits: parseInt((flaggedResult.rows[0] as Record<string, unknown>).cnt as string, 10),
    total_photos: parseInt((photosResult.rows[0] as Record<string, unknown>).cnt as string, 10),
  };

  // Rep stats
  const repResult = await pool.query(
    `SELECT v.employee_id, e.name as employee_name,
            COUNT(*) as visits,
            COUNT(DISTINCT v.store_id) as unique_stores,
            COALESCE(AVG(v.duration_minutes), 0) as avg_duration
     FROM visits v
     JOIN employees e ON e.id = v.employee_id
     WHERE v.company_id = $1 AND v.checked_in_at >= $2 AND v.checked_in_at < $3
     GROUP BY v.employee_id, e.name`,
    [companyId, weekStart, weekEnd],
  );

  const rep_stats = [];
  for (const row of repResult.rows) {
    const r = row as Record<string, unknown>;
    const empId = r.employee_id as string;

    const clResult = await pool.query(
      `SELECT COALESCE(AVG(vcr.completion_rate), 0) as avg_rate
       FROM visit_checklist_results vcr JOIN visits v ON v.id = vcr.visit_id
       WHERE v.company_id = $1 AND v.employee_id = $2 AND v.checked_in_at >= $3 AND v.checked_in_at < $4`,
      [companyId, empId, weekStart, weekEnd],
    );

    const flagResult = await pool.query(
      `SELECT COUNT(DISTINCT v.id) as cnt FROM visits v JOIN visit_integrity_flags vif ON vif.visit_id = v.id
       WHERE v.company_id = $1 AND v.employee_id = $2 AND v.checked_in_at >= $3 AND v.checked_in_at < $4 AND NOT vif.resolved`,
      [companyId, empId, weekStart, weekEnd],
    );

    const totalVisitCount = parseInt(r.visits as string, 10);
    const flagged = parseInt((flagResult.rows[0] as Record<string, unknown>).cnt as string, 10);

    rep_stats.push({
      employee_id: empId,
      employee_name: r.employee_name as string,
      visits: totalVisitCount,
      unique_stores: parseInt(r.unique_stores as string, 10),
      avg_duration: Math.round(parseFloat(r.avg_duration as string)),
      checklist_completion_rate: Math.round(parseFloat((clResult.rows[0] as Record<string, unknown>).avg_rate as string)),
      flagged_visits: flagged,
      verified_visits: totalVisitCount - flagged,
    });
  }

  // Goal progress snapshot
  const goalSnapshot = await pool.query(
    `SELECT gp.*, e.name as employee_name
     FROM goal_progress gp
     JOIN monthly_goals mg ON mg.id = gp.goal_id
     JOIN employees e ON e.id = gp.employee_id
     WHERE mg.company_id = $1 AND mg.month = date_trunc('month', CURRENT_DATE)::date`,
    [companyId],
  );

  // OOS stores
  const oosResult = await pool.query(
    `SELECT DISTINCT v.store_id, s.name as store_name, v.checked_in_at as detected_at
     FROM visits v JOIN stores s ON s.id = v.store_id
     WHERE v.company_id = $1 AND v.checked_in_at >= $2 AND v.checked_in_at < $3 AND v.stock_status = 'out_of_stock'`,
    [companyId, weekStart, weekEnd],
  );

  return {
    summary,
    rep_stats,
    goal_progress_snapshot: goalSnapshot.rows,
    top_sos_changes: [],
    oos_stores: oosResult.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return { store_id: row.store_id as string, store_name: row.store_name as string, product_name: '--', detected_at: row.detected_at as string };
    }),
  };
}

export function generateReportCSV(report: { summary: Record<string, unknown>; rep_stats: Array<Record<string, unknown>> }): string {
  const lines: string[] = [];
  lines.push('Weekly Report');
  lines.push(`Week,${report.summary.week_start},${report.summary.week_end}`);
  lines.push(`Total Visits,${report.summary.total_visits}`);
  lines.push(`Unique Stores,${report.summary.unique_stores_visited}`);
  lines.push(`Coverage %,${report.summary.coverage_percent}`);
  lines.push(`OOS Incidents,${report.summary.oos_incidents}`);
  lines.push(`Flagged Visits,${report.summary.flagged_visits}`);
  lines.push('');
  lines.push('Rep Performance');
  lines.push('Name,Visits,Unique Stores,Avg Duration (min),Checklist %,Verified,Flagged');
  for (const rep of report.rep_stats) {
    lines.push(`${rep.employee_name},${rep.visits},${rep.unique_stores},${rep.avg_duration},${rep.checklist_completion_rate},${rep.verified_visits},${rep.flagged_visits}`);
  }
  return lines.join('\n');
}
