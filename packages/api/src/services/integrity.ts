import pool from '../db/pool.js';

export async function checkVisitIntegrity(companyId: string, visitId: string): Promise<void> {
  // Get visit with store location
  const visitResult = await pool.query(
    `SELECT v.id, v.store_id, v.employee_id, v.checked_in_at, v.gps_lat, v.gps_lng,
            v.gps_accuracy_m, v.duration_minutes,
            ST_Distance(s.location::geography, ST_SetSRID(ST_MakePoint(v.gps_lng, v.gps_lat), 4326)::geography) as distance_m
     FROM visits v
     JOIN stores s ON s.id = v.store_id
     WHERE v.id = $1 AND v.company_id = $2`,
    [visitId, companyId],
  );

  if (visitResult.rows.length === 0) return;
  const visit = visitResult.rows[0] as Record<string, unknown>;

  const flags: Array<{ flag_type: string; severity: string; details: Record<string, unknown> }> = [];

  // 1. GPS too far from store (>200m)
  const distanceM = parseFloat(visit.distance_m as string);
  if (distanceM > 200) {
    flags.push({
      flag_type: 'gps_too_far',
      severity: 'critical',
      details: { distance_m: Math.round(distanceM), threshold_m: 200, message: `GPS was ${Math.round(distanceM)}m from store (max 200m)` },
    });
  }

  // 2. GPS accuracy low (>50m)
  const accuracy = visit.gps_accuracy_m as number;
  if (accuracy != null && accuracy > 50) {
    flags.push({
      flag_type: 'gps_accuracy_low',
      severity: 'warning',
      details: { accuracy_m: accuracy, threshold_m: 50, message: `GPS accuracy was ${accuracy}m, threshold is 50m` },
    });
  }

  // 3. Visit too short
  const duration = visit.duration_minutes as number;
  if (duration != null) {
    if (duration < 1) {
      flags.push({
        flag_type: 'visit_too_short',
        severity: 'critical',
        details: { actual_duration_minutes: duration, minimum_required: 3, message: `Visit lasted only ${duration} minutes` },
      });
    } else if (duration < 3) {
      flags.push({
        flag_type: 'visit_too_short',
        severity: 'warning',
        details: { actual_duration_minutes: duration, minimum_required: 3, message: `Visit lasted only ${duration} minutes` },
      });
    }
  }

  // 4. Impossible travel
  const prevVisit = await pool.query(
    `SELECT v.id, v.checked_in_at,
            ST_Distance(s.location::geography, s2.location::geography) as dist_m
     FROM visits v
     JOIN stores s ON s.id = v.store_id
     JOIN stores s2 ON s2.id = $3
     WHERE v.employee_id = $1 AND v.company_id = $4
       AND v.id != $5
       AND v.checked_in_at < $2
       AND v.checked_in_at > ($2::timestamptz - interval '30 minutes')
     ORDER BY v.checked_in_at DESC LIMIT 1`,
    [visit.employee_id, visit.checked_in_at, visit.store_id, companyId, visitId],
  );

  if (prevVisit.rows.length > 0) {
    const prev = prevVisit.rows[0] as Record<string, unknown>;
    const distKm = parseFloat(prev.dist_m as string) / 1000;
    const timeDiffMs = new Date(visit.checked_in_at as string).getTime() - new Date(prev.checked_in_at as string).getTime();
    const timeHours = timeDiffMs / (1000 * 60 * 60);
    if (timeHours > 0) {
      const speedKmh = distKm / timeHours;
      if (speedKmh > 120) {
        flags.push({
          flag_type: 'impossible_travel',
          severity: 'critical',
          details: { distance_km: Math.round(distKm * 10) / 10, time_minutes: Math.round(timeHours * 60), speed_kmh: Math.round(speedKmh), message: `Traveled ${Math.round(distKm)}km in ${Math.round(timeHours * 60)}min (${Math.round(speedKmh)}km/h)` },
        });
      }
    }
  }

  // 5. Burst visits (>5 in 60 min)
  const burstResult = await pool.query(
    `SELECT COUNT(*) as cnt FROM visits
     WHERE employee_id = $1 AND company_id = $2
       AND checked_in_at BETWEEN ($3::timestamptz - interval '60 minutes') AND ($3::timestamptz + interval '60 minutes')`,
    [visit.employee_id, companyId, visit.checked_in_at],
  );
  if (parseInt((burstResult.rows[0] as Record<string, unknown>).cnt as string, 10) > 5) {
    flags.push({
      flag_type: 'burst_visits',
      severity: 'critical',
      details: { visits_in_hour: parseInt((burstResult.rows[0] as Record<string, unknown>).cnt as string, 10), threshold: 5, message: 'More than 5 visits within 1 hour' },
    });
  }

  // 6. Same GPS different stores
  const sameGpsResult = await pool.query(
    `SELECT id, store_id FROM visits
     WHERE employee_id = $1 AND company_id = $2
       AND id != $3
       AND store_id != $4
       AND ABS(gps_lat - $5) < 0.0001 AND ABS(gps_lng - $6) < 0.0001
       AND checked_in_at > ($7::timestamptz - interval '24 hours')
     LIMIT 1`,
    [visit.employee_id, companyId, visitId, visit.store_id, visit.gps_lat, visit.gps_lng, visit.checked_in_at],
  );
  if (sameGpsResult.rows.length > 0) {
    flags.push({
      flag_type: 'same_gps_different_stores',
      severity: 'warning',
      details: { other_visit_id: (sameGpsResult.rows[0] as Record<string, unknown>).id, message: 'Same GPS coordinates used for different stores' },
    });
  }

  // 7. Off hours
  const hour = new Date(visit.checked_in_at as string).getHours();
  if (hour < 7 || hour > 21) {
    flags.push({
      flag_type: 'off_hours',
      severity: 'warning',
      details: { hour, message: `Visit at ${hour}:00 — outside working hours (7am-9pm)` },
    });
  }

  // Insert all flags
  for (const flag of flags) {
    await pool.query(
      `INSERT INTO visit_integrity_flags (visit_id, flag_type, severity, details)
       VALUES ($1, $2, $3, $4)`,
      [visitId, flag.flag_type, flag.severity, JSON.stringify(flag.details)],
    );
  }
}

export async function getIntegrityFlags(
  companyId: string,
  options: { resolved?: boolean; flag_type?: string; employee_id?: string; page?: number; limit?: number },
) {
  const conditions: string[] = ['v.company_id = $1'];
  const params: unknown[] = [companyId];
  let paramIndex = 2;

  if (options.resolved !== undefined) {
    conditions.push(`vif.resolved = $${paramIndex}`);
    params.push(options.resolved);
    paramIndex++;
  }
  if (options.flag_type) {
    conditions.push(`vif.flag_type = $${paramIndex}`);
    params.push(options.flag_type);
    paramIndex++;
  }
  if (options.employee_id) {
    conditions.push(`v.employee_id = $${paramIndex}`);
    params.push(options.employee_id);
    paramIndex++;
  }

  const where = conditions.join(' AND ');
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM visit_integrity_flags vif JOIN visits v ON v.id = vif.visit_id WHERE ${where}`,
    params,
  );
  const total = parseInt((countResult.rows[0] as Record<string, unknown>).count as string, 10);

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT vif.*, v.checked_in_at, v.store_id, v.employee_id,
            e.name as employee_name, s.name as store_name
     FROM visit_integrity_flags vif
     JOIN visits v ON v.id = vif.visit_id
     JOIN employees e ON e.id = v.employee_id
     JOIN stores s ON s.id = v.store_id
     WHERE ${where}
     ORDER BY vif.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params,
  );

  return { flags: result.rows, total, page, limit, total_pages: Math.ceil(total / limit) };
}

export async function resolveFlag(flagId: string, resolvedBy: string): Promise<unknown> {
  const result = await pool.query(
    `UPDATE visit_integrity_flags SET resolved = true, resolved_by = $2, resolved_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [flagId, resolvedBy],
  );
  return result.rows[0] || null;
}

export async function getIntegritySummary(companyId: string) {
  const base = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE NOT vif.resolved) as total_unresolved,
            COUNT(*) FILTER (WHERE NOT vif.resolved AND vif.severity = 'critical') as critical_count,
            COUNT(*) FILTER (WHERE NOT vif.resolved AND vif.severity = 'warning') as warning_count
     FROM visit_integrity_flags vif
     JOIN visits v ON v.id = vif.visit_id
     WHERE v.company_id = $1`,
    [companyId],
  );

  const byType = await pool.query(
    `SELECT vif.flag_type, COUNT(*) as cnt
     FROM visit_integrity_flags vif
     JOIN visits v ON v.id = vif.visit_id
     WHERE v.company_id = $1 AND NOT vif.resolved
     GROUP BY vif.flag_type`,
    [companyId],
  );

  const byEmployee = await pool.query(
    `SELECT e.name, COUNT(*) as cnt
     FROM visit_integrity_flags vif
     JOIN visits v ON v.id = vif.visit_id
     JOIN employees e ON e.id = v.employee_id
     WHERE v.company_id = $1 AND NOT vif.resolved
     GROUP BY e.name ORDER BY cnt DESC`,
    [companyId],
  );

  const summary = base.rows[0] as Record<string, unknown>;
  const typeMap: Record<string, number> = {};
  for (const row of byType.rows) {
    const r = row as Record<string, unknown>;
    typeMap[r.flag_type as string] = parseInt(r.cnt as string, 10);
  }
  const sevMap: Record<string, number> = {
    critical: parseInt(summary.critical_count as string, 10),
    warning: parseInt(summary.warning_count as string, 10),
  };

  return {
    total_unresolved: parseInt(summary.total_unresolved as string, 10),
    by_type: typeMap,
    by_severity: sevMap,
    by_employee: byEmployee.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return { name: row.name as string, count: parseInt(row.cnt as string, 10) };
    }),
  };
}
