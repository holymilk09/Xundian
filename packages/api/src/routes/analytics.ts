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

  // GET /analytics/visit-trends — daily visit counts for last 30 days
  app.get(
    '/visit-trends',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;

      const result = await pool.query(
        `SELECT DATE(checked_in_at) as date, COUNT(*) as visits
         FROM visits
         WHERE company_id = $1 AND checked_in_at > NOW() - INTERVAL '30 days'
         GROUP BY DATE(checked_in_at)
         ORDER BY date`,
        [companyId],
      );

      return reply.send({
        success: true,
        data: result.rows.map((row: Record<string, unknown>) => ({
          date: row.date,
          visits: parseInt(row.visits as string, 10),
        })),
      });
    },
  );

  // GET /analytics/coverage — per-tier coverage rate
  app.get(
    '/coverage',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;

      // Fetch tier config
      const configResult = await pool.query(
        'SELECT tier_config FROM companies WHERE id = $1',
        [companyId],
      );

      const tierConfig = configResult.rows[0]?.tier_config || {
        A: { revisit_days: 7 },
        B: { revisit_days: 14 },
        C: { revisit_days: 30 },
      };

      // For each tier, count total stores and stores visited within their revisit window
      const tiers = ['A', 'B', 'C'] as const;
      const coverage: Record<string, { total: number; covered: number; rate: number }> = {};
      let overallTotal = 0;
      let overallCovered = 0;

      for (const tier of tiers) {
        const revisitDays = tierConfig[tier]?.revisit_days || 30;

        const [totalResult, coveredResult] = await Promise.all([
          pool.query(
            'SELECT COUNT(*) FROM stores WHERE company_id = $1 AND tier = $2',
            [companyId, tier],
          ),
          pool.query(
            `SELECT COUNT(DISTINCT s.id)
             FROM stores s
             JOIN visits v ON v.store_id = s.id AND v.company_id = s.company_id
             WHERE s.company_id = $1
               AND s.tier = $2
               AND v.checked_in_at > NOW() - ($3::int || ' days')::interval`,
            [companyId, tier, revisitDays],
          ),
        ]);

        const total = parseInt(totalResult.rows[0]!.count as string, 10);
        const covered = parseInt(coveredResult.rows[0]!.count as string, 10);

        coverage[tier] = {
          total,
          covered,
          rate: total > 0 ? Math.round((covered / total) * 100) : 0,
        };

        overallTotal += total;
        overallCovered += covered;
      }

      coverage.overall = {
        total: overallTotal,
        covered: overallCovered,
        rate: overallTotal > 0 ? Math.round((overallCovered / overallTotal) * 100) : 0,
      };

      return reply.send({ success: true, data: coverage });
    },
  );

  // GET /analytics/team-comparison — per-rep stats this week
  app.get(
    '/team-comparison',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;

      const result = await pool.query(
        `SELECT e.id, e.name,
                COUNT(v.id) as visits_this_week,
                COUNT(DISTINCT v.store_id) as unique_stores,
                COALESCE(AVG(v.duration_minutes), 0) as avg_duration
         FROM employees e
         LEFT JOIN visits v ON v.employee_id = e.id
           AND v.checked_in_at > NOW() - INTERVAL '7 days'
           AND v.company_id = e.company_id
         WHERE e.company_id = $1 AND e.is_active = true
         GROUP BY e.id, e.name
         ORDER BY visits_this_week DESC`,
        [companyId],
      );

      return reply.send({
        success: true,
        data: result.rows.map((row: Record<string, unknown>) => ({
          id: row.id,
          name: row.name,
          visits_this_week: parseInt(row.visits_this_week as string, 10),
          unique_stores: parseInt(row.unique_stores as string, 10),
          avg_duration: Math.round(parseFloat(row.avg_duration as string) * 10) / 10,
        })),
      });
    },
  );
}
