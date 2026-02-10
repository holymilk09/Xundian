import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';

interface NotificationParams {
  id: string;
}

export async function notificationRoutes(app: FastifyInstance) {
  // GET /notifications — list notifications for current employee, newest first, limit 50
  app.get(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const employeeId = request.employee.id;

      const result = await pool.query(
        `SELECT * FROM notifications
         WHERE employee_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [employeeId],
      );

      return reply.send({ success: true, data: result.rows });
    },
  );

  // PATCH /notifications/:id/read — mark one notification as read
  app.patch<{ Params: NotificationParams }>(
    '/:id/read',
    async (request: FastifyRequest<{ Params: NotificationParams }>, reply: FastifyReply) => {
      const employeeId = request.employee.id;
      const { id } = request.params;

      const result = await pool.query(
        `UPDATE notifications
         SET read = true
         WHERE id = $1 AND employee_id = $2
         RETURNING *`,
        [id, employeeId],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Notification not found',
        });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

  // POST /notifications/read-all — mark all unread notifications for current employee as read
  app.post(
    '/read-all',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const employeeId = request.employee.id;

      const result = await pool.query(
        `UPDATE notifications
         SET read = true
         WHERE employee_id = $1 AND NOT read
         RETURNING *`,
        [employeeId],
      );

      return reply.send({
        success: true,
        data: {
          marked_read: result.rowCount,
        },
      });
    },
  );
}
