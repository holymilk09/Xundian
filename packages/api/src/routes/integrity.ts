import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getIntegrityFlags, resolveFlag, getIntegritySummary } from '../services/integrity.js';
import { requireManager } from '../middleware/requireManager.js';
import pool from '../db/pool.js';

interface FlagsQuerystring {
  resolved?: string;
  flag_type?: string;
  employee_id?: string;
  page?: string;
  limit?: string;
}

interface AuditQuerystring {
  employee_id?: string;
  entity_type?: string;
  page?: string;
  limit?: string;
}

export async function integrityRoutes(app: FastifyInstance) {
  // GET /integrity/summary
  app.get('/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(request, reply)) return;
    const summary = await getIntegritySummary(request.companyId!);
    return reply.send({ success: true, data: summary });
  });

  // GET /integrity/audit-events
  app.get<{ Querystring: AuditQuerystring }>(
    '/audit-events',
    async (request: FastifyRequest<{ Querystring: AuditQuerystring }>, reply: FastifyReply) => {
      if (!requireManager(request, reply)) return;

      const page = Math.min(Math.max(parseInt(request.query.page || '1', 10) || 1, 1), 1000);
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '20', 10)));
      const offset = (page - 1) * limit;
      const conditions = ['ae.company_id = $1'];
      const params: unknown[] = [request.companyId];
      let paramIndex = 2;

      if (request.query.employee_id) {
        conditions.push(`ae.employee_id = $${paramIndex}`);
        params.push(request.query.employee_id);
        paramIndex++;
      }

      if (request.query.entity_type) {
        conditions.push(`ae.entity_type = $${paramIndex}`);
        params.push(request.query.entity_type);
        paramIndex++;
      }

      const where = conditions.join(' AND ');
      const countResult = await pool.query(`SELECT COUNT(*) FROM audit_events ae WHERE ${where}`, params);
      const total = parseInt(countResult.rows[0]!.count, 10);

      params.push(limit, offset);
      const result = await pool.query(
        `SELECT ae.*, e.name as employee_name
         FROM audit_events ae
         LEFT JOIN employees e ON e.id = ae.employee_id
         WHERE ${where}
         ORDER BY ae.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params,
      );

      return reply.send({
        success: true,
        data: result.rows,
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
      });
    },
  );

  // GET /integrity/flags
  app.get<{ Querystring: FlagsQuerystring }>(
    '/flags',
    async (request: FastifyRequest<{ Querystring: FlagsQuerystring }>, reply: FastifyReply) => {
      if (!requireManager(request, reply)) return;

      const result = await getIntegrityFlags(request.companyId!, {
        resolved: request.query.resolved === 'true' ? true : request.query.resolved === 'false' ? false : undefined,
        flag_type: request.query.flag_type || undefined,
        employee_id: request.query.employee_id || undefined,
        page: request.query.page ? parseInt(request.query.page, 10) : 1,
        limit: request.query.limit ? parseInt(request.query.limit, 10) : 20,
      });

      return reply.send({
        success: true,
        data: result.flags,
        pagination: { page: result.page, limit: result.limit, total: result.total, total_pages: result.total_pages },
      });
    },
  );

  // GET /integrity/flags/visit/:visitId
  app.get<{ Params: { visitId: string } }>(
    '/flags/visit/:visitId',
    async (request: FastifyRequest<{ Params: { visitId: string } }>, reply: FastifyReply) => {
      const result = await getIntegrityFlags(request.companyId!, {
        resolved: undefined,
      });
      // Filter to specific visit — simpler than adding visit filter to service
      const visitFlags = result.flags.filter((f: Record<string, unknown>) => f.visit_id === request.params.visitId);
      return reply.send({ success: true, data: visitFlags });
    },
  );

  // POST /integrity/flags/:id/resolve
  app.post<{ Params: { id: string } }>(
    '/flags/:id/resolve',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!requireManager(request, reply)) return;
      const flag = await resolveFlag(request.params.id, request.employee.id);
      if (!flag) {
        return reply.code(404).send({ success: false, error: 'Flag not found' });
      }
      return reply.send({ success: true, data: flag });
    },
  );
}
