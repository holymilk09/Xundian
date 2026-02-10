import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';

export async function alertRoutes(app: FastifyInstance) {
  // GET /alerts — list alerts (revisit schedule items)
  app.get(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;
      const isRep = request.employee.role === 'rep';

      let result;
      if (isRep) {
        result = await pool.query(
          `SELECT rs.id, rs.store_id, s.name as store_name, s.name_zh as store_name_zh, s.tier,
                  rs.next_visit_date, rs.priority, rs.reason, rs.assigned_to
           FROM revisit_schedule rs
           JOIN stores s ON s.id = rs.store_id
           WHERE rs.company_id = $1 AND rs.assigned_to = $2 AND NOT rs.completed
           ORDER BY rs.next_visit_date ASC`,
          [companyId, request.employee.id],
        );
      } else {
        result = await pool.query(
          `SELECT rs.id, rs.store_id, s.name as store_name, s.name_zh as store_name_zh, s.tier,
                  rs.next_visit_date, rs.priority, rs.reason, rs.assigned_to
           FROM revisit_schedule rs
           JOIN stores s ON s.id = rs.store_id
           WHERE rs.company_id = $1 AND NOT rs.completed
           ORDER BY rs.next_visit_date ASC`,
          [companyId],
        );
      }

      return reply.send({ success: true, data: result.rows });
    },
  );
}
