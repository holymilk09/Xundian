import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';
import { generateWeeklyReport, generateReportCSV } from '../services/weeklyReport.js';
import { requireManager } from '../middleware/requireManager.js';

interface WeeklyQuerystring {
  week_start?: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function getMostRecentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0]!;
}

export async function reportRoutes(app: FastifyInstance) {
  // GET /reports/weekly
  app.get<{ Querystring: WeeklyQuerystring }>(
    '/weekly',
    async (request: FastifyRequest<{ Querystring: WeeklyQuerystring }>, reply: FastifyReply) => {
      if (!requireManager(request, reply)) return;

      const weekStart = request.query.week_start || getMostRecentMonday();
      if (request.query.week_start && !DATE_REGEX.test(request.query.week_start)) {
        return reply.code(400).send({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
      }
      const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

      const report = await generateWeeklyReport(request.companyId!, weekStart, weekEnd);
      return reply.send({ success: true, data: report });
    },
  );

  // GET /reports/weekly/export/csv
  app.get<{ Querystring: WeeklyQuerystring }>(
    '/weekly/export/csv',
    async (request: FastifyRequest<{ Querystring: WeeklyQuerystring }>, reply: FastifyReply) => {
      if (!requireManager(request, reply)) return;

      const weekStart = request.query.week_start || getMostRecentMonday();
      if (request.query.week_start && !DATE_REGEX.test(request.query.week_start)) {
        return reply.code(400).send({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
      }
      const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

      const report = await generateWeeklyReport(request.companyId!, weekStart, weekEnd);
      const csv = generateReportCSV(report as { summary: Record<string, unknown>; rep_stats: Array<Record<string, unknown>> });

      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename=xundian-weekly-report-${weekStart}.csv`)
        .send(csv);
    },
  );

  // GET /reports/weekly/export/json
  app.get<{ Querystring: WeeklyQuerystring }>(
    '/weekly/export/json',
    async (request: FastifyRequest<{ Querystring: WeeklyQuerystring }>, reply: FastifyReply) => {
      if (!requireManager(request, reply)) return;

      const weekStart = request.query.week_start || getMostRecentMonday();
      if (request.query.week_start && !DATE_REGEX.test(request.query.week_start)) {
        return reply.code(400).send({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
      }
      const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

      const report = await generateWeeklyReport(request.companyId!, weekStart, weekEnd);
      return reply.send({ success: true, data: report });
    },
  );

  // GET /reports/history
  app.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireManager(request, reply)) return;

    const companyId = request.companyId;

    const result = await pool.query(
      `SELECT
         week_start::text as week_start,
         (week_start + INTERVAL '7 days')::date::text as week_end,
         COALESCE(cnt, 0)::int as visit_count
       FROM generate_series(
         DATE_TRUNC('week', NOW())::date - INTERVAL '11 weeks',
         DATE_TRUNC('week', NOW())::date,
         INTERVAL '1 week'
       ) AS week_start
       LEFT JOIN (
         SELECT DATE_TRUNC('week', checked_in_at)::date as visit_week, COUNT(*) as cnt
         FROM visits
         WHERE company_id = $1
           AND checked_in_at >= DATE_TRUNC('week', NOW())::date - INTERVAL '11 weeks'
         GROUP BY visit_week
       ) v ON v.visit_week = week_start::date
       ORDER BY week_start DESC`,
      [companyId],
    );

    return reply.send({ success: true, data: result.rows });
  });
}
