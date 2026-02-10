import pool from '../db/pool.js';
import type { StockStatus, TierConfig } from '@xundian/shared';

/**
 * Schedule the next revisit for a store based on stock status and company tier config.
 *
 * Priority logic:
 * - out_of_stock -> high priority, revisit in 2 days, reason='oos_detected'
 * - low_stock -> high priority, revisit in half tier days (min 3), reason='low_stock'
 * - Otherwise -> normal priority, revisit per tier config days, reason='scheduled'
 *
 * Also marks existing uncompleted schedules for this store as completed.
 */
export async function scheduleNextRevisit(
  companyId: string,
  storeId: string,
  employeeId: string,
  stockStatus: StockStatus,
): Promise<Record<string, unknown>> {
  // 1. Fetch company tier_config and store tier
  const [companyResult, storeResult] = await Promise.all([
    pool.query('SELECT tier_config FROM companies WHERE id = $1', [companyId]),
    pool.query('SELECT tier FROM stores WHERE id = $1 AND company_id = $2', [storeId, companyId]),
  ]);

  if (companyResult.rows.length === 0 || storeResult.rows.length === 0) {
    throw new Error('Company or store not found');
  }

  const tierConfig: TierConfig = companyResult.rows[0]!.tier_config || {
    A: { revisit_days: 7 },
    B: { revisit_days: 14 },
    C: { revisit_days: 30 },
  };

  const storeTier = (storeResult.rows[0]!.tier as string) || 'C';
  const tierDays = tierConfig[storeTier as keyof TierConfig]?.revisit_days || 30;

  // 2. Determine priority, days until revisit, and reason
  let priority: string;
  let daysUntilRevisit: number;
  let reason: string;

  if (stockStatus === 'out_of_stock') {
    priority = 'high';
    daysUntilRevisit = 2;
    reason = 'oos_detected';
  } else if (stockStatus === 'low_stock') {
    priority = 'high';
    daysUntilRevisit = Math.max(3, Math.floor(tierDays / 2));
    reason = 'low_stock';
  } else {
    priority = 'normal';
    daysUntilRevisit = tierDays;
    reason = 'scheduled';
  }

  // 3. Mark existing uncompleted schedules for this store as completed
  await pool.query(
    `UPDATE revisit_schedule
     SET completed = true
     WHERE store_id = $1 AND company_id = $2 AND NOT completed`,
    [storeId, companyId],
  );

  // 4. Insert new revisit_schedule row
  const result = await pool.query(
    `INSERT INTO revisit_schedule (store_id, company_id, next_visit_date, priority, reason, assigned_to)
     VALUES ($1, $2, CURRENT_DATE + $3::int, $4, $5, $6)
     RETURNING *`,
    [storeId, companyId, daysUntilRevisit, priority, reason, employeeId],
  );

  return result.rows[0] as Record<string, unknown>;
}
