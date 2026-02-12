import pool from '../db/pool.js';

function escapeCSV(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: Record<string, unknown>[], keys: string[]): string {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map((row) =>
    keys.map((key) => escapeCSV(row[key])).join(','),
  );
  return [headerLine, ...dataLines].join('\r\n') + '\r\n';
}

export async function exportVisits(
  companyId: string,
  startDate?: string,
  endDate?: string,
): Promise<string> {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  const result = await pool.query(
    `SELECT v.id, v.checked_in_at, v.stock_status, v.notes, v.duration_minutes,
            v.gps_lat, v.gps_lng, v.gps_accuracy_m,
            e.name AS rep_name,
            s.name AS store_name, s.name_zh AS store_name_zh, s.tier,
            (SELECT COUNT(*) FROM visit_photos vp WHERE vp.visit_id = v.id) AS photo_count,
            (SELECT string_agg(
              COALESCE(vcr.results::text, ''),
              '; '
            ) FROM visit_checklist_results vcr WHERE vcr.visit_id = v.id) AS checklist_summary
     FROM visits v
     JOIN employees e ON e.id = v.employee_id
     JOIN stores s ON s.id = v.store_id
     WHERE v.company_id = $1
       AND v.checked_in_at >= $2::date
       AND v.checked_in_at < ($3::date + interval '1 day')
     ORDER BY v.checked_in_at DESC
     LIMIT 10000`,
    [companyId, start, end],
  );

  const headers = [
    'Visit ID', 'Date', 'Rep Name', 'Store Name', 'Store Name (ZH)', 'Tier',
    'Stock Status', 'Duration (min)', 'GPS Lat', 'GPS Lng', 'GPS Accuracy (m)',
    'Notes', 'Photos', 'Checklist Summary',
  ];
  const keys = [
    'id', 'checked_in_at', 'rep_name', 'store_name', 'store_name_zh', 'tier',
    'stock_status', 'duration_minutes', 'gps_lat', 'gps_lng', 'gps_accuracy_m',
    'notes', 'photo_count', 'checklist_summary',
  ];

  return toCSV(headers, result.rows, keys);
}

export async function exportStores(companyId: string): Promise<string> {
  const result = await pool.query(
    `SELECT s.id, s.name, s.name_zh, s.tier, s.store_type, s.address,
            s.contact_name, s.contact_phone, s.approval_status,
            ST_Y(s.location) AS lat, ST_X(s.location) AS lng,
            s.created_at,
            (SELECT COUNT(*) FROM visits v WHERE v.store_id = s.id) AS visit_count,
            (SELECT vp.ai_analysis->>'share_of_shelf_percent'
             FROM visit_photos vp
             JOIN visits v2 ON v2.id = vp.visit_id
             WHERE v2.store_id = s.id AND vp.ai_analysis IS NOT NULL
             ORDER BY vp.created_at DESC LIMIT 1) AS latest_sos
     FROM stores s
     WHERE s.company_id = $1
     ORDER BY s.name
     LIMIT 10000`,
    [companyId],
  );

  const headers = [
    'Store ID', 'Name', 'Name (ZH)', 'Tier', 'Type', 'Address',
    'Contact', 'Phone', 'Status', 'Latitude', 'Longitude',
    'Created', 'Visit Count', 'Latest SoS %',
  ];
  const keys = [
    'id', 'name', 'name_zh', 'tier', 'store_type', 'address',
    'contact_name', 'contact_phone', 'approval_status', 'lat', 'lng',
    'created_at', 'visit_count', 'latest_sos',
  ];

  return toCSV(headers, result.rows, keys);
}

export async function exportGoals(
  companyId: string,
  month?: string,
): Promise<string> {
  const targetMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const result = await pool.query(
    `SELECT mg.id AS goal_id, mg.metric, mg.target, mg.label, mg.month,
            e.name AS employee_name,
            COALESCE(gp.current_value, 0) AS current_value,
            CASE WHEN mg.target > 0 THEN ROUND((COALESCE(gp.current_value, 0)::numeric / mg.target) * 100, 1) ELSE 0 END AS percent
     FROM monthly_goals mg
     LEFT JOIN goal_progress gp ON gp.goal_id = mg.id
     LEFT JOIN employees e ON e.id = gp.employee_id
     WHERE mg.company_id = $1
       AND mg.month = $2
     ORDER BY e.name, mg.metric
     LIMIT 10000`,
    [companyId, targetMonth],
  );

  const headers = [
    'Goal ID', 'Month', 'Metric', 'Target', 'Label',
    'Employee', 'Current', 'Percent',
  ];
  const keys = [
    'goal_id', 'month', 'metric', 'target', 'label',
    'employee_name', 'current_value', 'percent',
  ];

  return toCSV(headers, result.rows, keys);
}

export async function exportShelfAnalysis(
  companyId: string,
  startDate?: string,
  endDate?: string,
): Promise<string> {
  const start = startDate || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  const result = await pool.query(
    `SELECT sc.id, sc.store_id,
            s.name AS store_name, s.name_zh AS store_name_zh, s.tier,
            sc.severity, sc.confidence, sc.reviewed,
            sc.diff_result->>'sos_change' AS sos_change,
            sc.created_at
     FROM shelf_comparisons sc
     JOIN stores s ON s.id = sc.store_id
     WHERE sc.company_id = $1
       AND sc.created_at >= $2::date
       AND sc.created_at < ($3::date + interval '1 day')
     ORDER BY sc.created_at DESC
     LIMIT 10000`,
    [companyId, start, end],
  );

  const headers = [
    'ID', 'Store ID', 'Store Name', 'Store Name (ZH)', 'Tier',
    'Severity', 'Confidence', 'Reviewed', 'SoS Change', 'Date',
  ];
  const keys = [
    'id', 'store_id', 'store_name', 'store_name_zh', 'tier',
    'severity', 'confidence', 'reviewed', 'sos_change', 'created_at',
  ];

  return toCSV(headers, result.rows, keys);
}

export async function exportIntegrityFlags(
  companyId: string,
  startDate?: string,
  endDate?: string,
): Promise<string> {
  const start = startDate || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  const result = await pool.query(
    `SELECT vif.id, vif.flag_type, vif.severity, vif.details,
            vif.resolved, vif.resolved_at, vif.created_at,
            e.name AS rep_name,
            s.name AS store_name, s.name_zh AS store_name_zh,
            v.checked_in_at AS visit_date
     FROM visit_integrity_flags vif
     JOIN visits v ON v.id = vif.visit_id
     JOIN employees e ON e.id = v.employee_id
     JOIN stores s ON s.id = v.store_id
     WHERE vif.company_id = $1
       AND vif.created_at >= $2::date
       AND vif.created_at < ($3::date + interval '1 day')
     ORDER BY vif.created_at DESC
     LIMIT 10000`,
    [companyId, start, end],
  );

  const headers = [
    'Flag ID', 'Type', 'Severity', 'Details', 'Resolved', 'Resolved At',
    'Rep Name', 'Store Name', 'Store Name (ZH)', 'Visit Date', 'Created',
  ];
  const keys = [
    'id', 'flag_type', 'severity', 'details', 'resolved', 'resolved_at',
    'rep_name', 'store_name', 'store_name_zh', 'visit_date', 'created_at',
  ];

  return toCSV(headers, result.rows, keys);
}
