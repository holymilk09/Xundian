import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getIntegrityFlags, resolveFlag, getIntegritySummary } from '../services/integrity.js';

interface FlagsQuerystring {
  resolved?: string;
  flag_type?: string;
  employee_id?: string;
  page?: string;
  limit?: string;
}

export async function integrityRoutes(app: FastifyInstance) {
  // GET /integrity/summary
  app.get('/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const role = request.employee.role;
    if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
      return reply.code(403).send({ success: false, error: 'Manager role required' });
    }
    const summary = await getIntegritySummary(request.companyId!);
    return reply.send({ success: true, data: summary });
  });

  // GET /integrity/flags
  app.get<{ Querystring: FlagsQuerystring }>(
    '/flags',
    async (request: FastifyRequest<{ Querystring: FlagsQuerystring }>, reply: FastifyReply) => {
      const role = request.employee.role;
      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

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
      const role = request.employee.role;
      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }
      const flag = await resolveFlag(request.params.id, request.employee.id);
      if (!flag) {
        return reply.code(404).send({ success: false, error: 'Flag not found' });
      }
      return reply.send({ success: true, data: flag });
    },
  );
}
