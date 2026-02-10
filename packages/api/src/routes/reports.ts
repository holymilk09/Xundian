import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';
import { generateWeeklyReport, generateReportCSV } from '../services/weeklyReport.js';

interface WeeklyQuerystring {
  week_start?: string;
}

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
      const weekStart = request.query.week_start || getMostRecentMonday();
      const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

      const report = await generateWeeklyReport(request.companyId!, weekStart, weekEnd);
      return reply.send({ success: true, data: report });
    },
  );

  // GET /reports/weekly/export/csv
  app.get<{ Querystring: WeeklyQuerystring }>(
    '/weekly/export/csv',
    async (request: FastifyRequest<{ Querystring: WeeklyQuerystring }>, reply: FastifyReply) => {
      const weekStart = request.query.week_start || getMostRecentMonday();
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
      const weekStart = request.query.week_start || getMostRecentMonday();
      const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

      const report = await generateWeeklyReport(request.companyId!, weekStart, weekEnd);
      return reply.send(report);
    },
  );

  // GET /reports/history
  app.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId;
    const weeks: Array<{ week_start: string; week_end: string; visit_count: number }> = [];

    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);
      const day = weekEnd.getDay();
      const mondayOffset = day === 0 ? 6 : day - 1;
      const monday = new Date(weekEnd);
      monday.setDate(weekEnd.getDate() - mondayOffset);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);

      const ws = monday.toISOString().split('T')[0]!;
      const we = sunday.toISOString().split('T')[0]!;

      const result = await pool.query(
        `SELECT COUNT(*) as cnt FROM visits WHERE company_id = $1 AND checked_in_at >= $2 AND checked_in_at < $3`,
        [companyId, ws, we],
      );

      weeks.push({
        week_start: ws,
        week_end: we,
        visit_count: parseInt((result.rows[0] as Record<string, unknown>).cnt as string, 10),
      });
    }

    return reply.send({ success: true, data: weeks });
  });
}
