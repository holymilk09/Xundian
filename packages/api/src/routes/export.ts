import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  exportVisits,
  exportStores,
  exportGoals,
  exportShelfAnalysis,
  exportIntegrityFlags,
} from '../services/dataExport.js';

const MANAGER_ROLES = ['admin', 'area_manager', 'regional_director'];

function requireManager(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!MANAGER_ROLES.includes(request.employee.role)) {
    reply.code(403).send({ success: false, error: 'Manager access required' });
    return false;
  }
  return true;
}

function sendCSV(reply: FastifyReply, csv: string, filename: string) {
  return reply
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send('\uFEFF' + csv); // BOM for Excel Chinese character support
}

interface DateQuery {
  start_date?: string;
  end_date?: string;
}

interface MonthQuery {
  month?: string;
}

export async function exportRoutes(app: FastifyInstance) {
  // GET /export/visits?start_date=&end_date=
  app.get<{ Querystring: DateQuery }>(
    '/visits',
    async (request: FastifyRequest<{ Querystring: DateQuery }>, reply: FastifyReply) => {
      if (!requireManager(request, reply)) return;
      const { start_date, end_date } = request.query;
      const csv = await exportVisits(request.companyId!, start_date, end_date);
      const dateSuffix = start_date || new Date().toISOString().split('T')[0];
      return sendCSV(reply, csv, `visits-${dateSuffix}.csv`);
    },
  );

  // GET /export/stores
  app.get(
    '/stores',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireManager(request, reply)) return;
      const csv = await exportStores(request.companyId!);
      return sendCSV(reply, csv, `stores-${new Date().toISOString().split('T')[0]}.csv`);
    },
  );

  // GET /export/goals?month=
  app.get<{ Querystring: MonthQuery }>(
    '/goals',
    async (request: FastifyRequest<{ Querystring: MonthQuery }>, reply: FastifyReply) => {
      if (!requireManager(request, reply)) return;
      const { month } = request.query;
      const csv = await exportGoals(request.companyId!, month);
      const monthSuffix = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      return sendCSV(reply, csv, `goals-${monthSuffix}.csv`);
    },
  );

  // GET /export/shelf-analysis?start_date=&end_date=
  app.get<{ Querystring: DateQuery }>(
    '/shelf-analysis',
    async (request: FastifyRequest<{ Querystring: DateQuery }>, reply: FastifyReply) => {
      if (!requireManager(request, reply)) return;
      const { start_date, end_date } = request.query;
      const csv = await exportShelfAnalysis(request.companyId!, start_date, end_date);
      const dateSuffix = start_date || new Date().toISOString().split('T')[0];
      return sendCSV(reply, csv, `shelf-analysis-${dateSuffix}.csv`);
    },
  );

  // GET /export/integrity?start_date=&end_date=
  app.get<{ Querystring: DateQuery }>(
    '/integrity',
    async (request: FastifyRequest<{ Querystring: DateQuery }>, reply: FastifyReply) => {
      if (!requireManager(request, reply)) return;
      const { start_date, end_date } = request.query;
      const csv = await exportIntegrityFlags(request.companyId!, start_date, end_date);
      const dateSuffix = start_date || new Date().toISOString().split('T')[0];
      return sendCSV(reply, csv, `integrity-flags-${dateSuffix}.csv`);
    },
  );
}
