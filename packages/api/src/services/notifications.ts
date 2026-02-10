import pool from '../db/pool.js';
import type { NotificationType } from '@xundian/shared';

interface CreateNotificationParams {
  company_id: string;
  employee_id: string;
  type: NotificationType;
  title: string;
  message: string;
  store_id?: string;
  schedule_id?: string;
}

/**
 * Create a new notification for an employee.
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<Record<string, unknown>> {
  const { company_id, employee_id, type, title, message, store_id, schedule_id } = params;

  const result = await pool.query(
    `INSERT INTO notifications (company_id, employee_id, type, title, message, store_id, schedule_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [company_id, employee_id, type, title, message, store_id || null, schedule_id || null],
  );

  return result.rows[0] as Record<string, unknown>;
}

/**
 * Generate revisit reminder notifications for all revisit_schedule entries
 * that are due tomorrow and not yet completed.
 *
 * Creates a 'revisit_reminder' notification for each assigned employee.
 */
export async function generateRevisitReminders(
  companyId: string,
): Promise<Record<string, unknown>[]> {
  // Find revisit schedules due tomorrow that are uncompleted
  const schedulesResult = await pool.query(
    `SELECT rs.id as schedule_id, rs.store_id, rs.assigned_to, rs.priority, rs.reason,
            s.name as store_name, s.name_zh as store_name_zh, s.tier
     FROM revisit_schedule rs
     JOIN stores s ON s.id = rs.store_id
     WHERE rs.company_id = $1
       AND rs.next_visit_date = CURRENT_DATE + 1
       AND NOT rs.completed
       AND rs.assigned_to IS NOT NULL`,
    [companyId],
  );

  const notifications: Record<string, unknown>[] = [];

  for (const schedule of schedulesResult.rows) {
    const storeName = (schedule.store_name_zh as string) || (schedule.store_name as string);
    const priorityLabel = schedule.priority === 'high' ? '[URGENT] ' : '';

    const notification = await createNotification({
      company_id: companyId,
      employee_id: schedule.assigned_to as string,
      type: 'revisit_reminder',
      title: `${priorityLabel}Revisit Reminder: ${storeName}`,
      message: `You have a ${schedule.priority} priority revisit scheduled for tomorrow at ${storeName} (Tier ${schedule.tier}). Reason: ${schedule.reason}.`,
      store_id: schedule.store_id as string,
      schedule_id: schedule.schedule_id as string,
    });

    notifications.push(notification);
  }

  return notifications;
}
