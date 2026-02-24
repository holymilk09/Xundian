import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  exportVisits,
  exportStores,
  exportGoals,
  exportShelfAnalysis,
  exportIntegrityFlags,
} from '../services/dataExport.js';
import { requireManager } from '../middleware/requireManager.js';

function sendCSV(reply: FastifyReply, csv: string, filename: string) {
  return reply
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send('\uFEFF' + csv); // BOM for Excel Chinese character support
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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
      if (start_date && !DATE_REGEX.test(start_date)) {
        return reply.code(400).send({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
      }
      if (end_date && !DATE_REGEX.test(end_date)) {
        return reply.code(400).send({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
      }
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
      if (month && !DATE_REGEX.test(month)) {
        return reply.code(400).send({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
      }
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
      if (start_date && !DATE_REGEX.test(start_date)) {
        return reply.code(400).send({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
      }
      if (end_date && !DATE_REGEX.test(end_date)) {
        return reply.code(400).send({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
      }
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
      if (start_date && !DATE_REGEX.test(start_date)) {
        return reply.code(400).send({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
      }
      if (end_date && !DATE_REGEX.test(end_date)) {
        return reply.code(400).send({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
      }
      const csv = await exportIntegrityFlags(request.companyId!, start_date, end_date);
      const dateSuffix = start_date || new Date().toISOString().split('T')[0];
      return sendCSV(reply, csv, `integrity-flags-${dateSuffix}.csv`);
    },
  );
}
