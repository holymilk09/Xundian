import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';

export async function analyticsRoutes(app: FastifyInstance) {
  // GET /analytics — dashboard stats (for managers)
  app.get(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;

      const [storesResult, visitedResult, oosResult, topPerformerResult] = await Promise.all([
        pool.query(
          'SELECT COUNT(*) FROM stores WHERE company_id = $1',
          [companyId],
        ),
        pool.query(
          `SELECT COUNT(DISTINCT store_id) FROM visits WHERE company_id = $1 AND checked_in_at > NOW() - INTERVAL '7 days'`,
          [companyId],
        ),
        pool.query(
          `SELECT COUNT(*) FROM revisit_schedule WHERE company_id = $1 AND reason = 'oos_detected' AND NOT completed`,
          [companyId],
        ),
        pool.query(
          `SELECT e.name, COUNT(*) as visits FROM visits v JOIN employees e ON e.id = v.employee_id WHERE v.company_id = $1 AND v.checked_in_at > NOW() - INTERVAL '7 days' GROUP BY e.id, e.name ORDER BY visits DESC LIMIT 1`,
          [companyId],
        ),
      ]);

      const topPerformer = topPerformerResult.rows[0]
        ? { name: topPerformerResult.rows[0].name, visits: parseInt(topPerformerResult.rows[0].visits, 10) }
        : null;

      return reply.send({
        success: true,
        data: {
          total_stores: parseInt(storesResult.rows[0]!.count, 10),
          visited_this_week: parseInt(visitedResult.rows[0]!.count, 10),
          oos_alerts: parseInt(oosResult.rows[0]!.count, 10),
          top_performer: topPerformer,
        },
      });
    },
  );

  // GET /analytics/rep — rep stats
  app.get(
    '/rep',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;
      const employeeId = request.employee.id;

      const [visitedResult, pendingResult, overdueResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) FROM visits WHERE company_id = $1 AND employee_id = $2 AND checked_in_at > NOW() - INTERVAL '7 days'`,
          [companyId, employeeId],
        ),
        pool.query(
          'SELECT COUNT(*) FROM revisit_schedule WHERE company_id = $1 AND assigned_to = $2 AND NOT completed AND next_visit_date >= CURRENT_DATE',
          [companyId, employeeId],
        ),
        pool.query(
          'SELECT COUNT(*) FROM revisit_schedule WHERE company_id = $1 AND assigned_to = $2 AND NOT completed AND next_visit_date < CURRENT_DATE',
          [companyId, employeeId],
        ),
      ]);

      return reply.send({
        success: true,
        data: {
          visited_this_week: parseInt(visitedResult.rows[0]!.count, 10),
          pending: parseInt(pendingResult.rows[0]!.count, 10),
          overdue: parseInt(overdueResult.rows[0]!.count, 10),
        },
      });
    },
  );
}
