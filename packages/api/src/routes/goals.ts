import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';
import { refreshAllProgress } from '../services/goalCalculation.js';

interface GoalBody {
  month: string;
  goals: Array<{ id: string; metric: string; target: number; label: string; label_zh?: string }>;
}

export async function goalRoutes(app: FastifyInstance) {
  // GET /goals/current
  app.get('/current', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId;
    const result = await pool.query(
      `SELECT * FROM monthly_goals WHERE company_id = $1 AND month = date_trunc('month', CURRENT_DATE)::date`,
      [companyId],
    );
    return reply.send({ success: true, data: result.rows[0] || null });
  });

  // GET /goals/leaderboard
  app.get('/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId;
    const result = await pool.query(
      `SELECT gp.employee_id, e.name as employee_name, gp.progress, gp.verified_count, gp.flagged_count
       FROM goal_progress gp
       JOIN monthly_goals mg ON mg.id = gp.goal_id
       JOIN employees e ON e.id = gp.employee_id
       WHERE mg.company_id = $1 AND mg.month = date_trunc('month', CURRENT_DATE)::date
       ORDER BY gp.verified_count DESC`,
      [companyId],
    );

    const leaderboard = result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      const progress = r.progress as Array<{ percent: number }>;
      const avgPercent = progress.length > 0 ? Math.round(progress.reduce((sum, p) => sum + p.percent, 0) / progress.length) : 0;
      return {
        employee_id: r.employee_id,
        employee_name: r.employee_name,
        avg_percent: avgPercent,
        verified_count: r.verified_count,
        flagged_count: r.flagged_count,
      };
    });

    leaderboard.sort((a, b) => (b.avg_percent as number) - (a.avg_percent as number));
    return reply.send({ success: true, data: leaderboard });
  });

  // POST /goals/progress/refresh
  app.post('/progress/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const role = request.employee.role;
    if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
      return reply.code(403).send({ success: false, error: 'Manager role required' });
    }
    const companyId = request.companyId;
    const goalResult = await pool.query(
      `SELECT id FROM monthly_goals WHERE company_id = $1 AND month = date_trunc('month', CURRENT_DATE)::date`,
      [companyId],
    );
    if (goalResult.rows.length > 0) {
      await refreshAllProgress(companyId!, (goalResult.rows[0] as Record<string, unknown>).id as string);
    }
    return reply.send({ success: true, data: { refreshed: true } });
  });

  // GET /goals/progress/current
  app.get('/progress/current', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId;
    const role = request.employee.role;
    const employeeId = request.employee.id;

    let query = `SELECT gp.*, e.name as employee_name
     FROM goal_progress gp
     JOIN monthly_goals mg ON mg.id = gp.goal_id
     JOIN employees e ON e.id = gp.employee_id
     WHERE mg.company_id = $1 AND mg.month = date_trunc('month', CURRENT_DATE)::date`;
    const params: unknown[] = [companyId];

    if (role === 'rep') {
      query += ` AND gp.employee_id = $2`;
      params.push(employeeId);
    }

    const result = await pool.query(query, params);
    return reply.send({ success: true, data: result.rows });
  });

  // GET /goals/progress/:employeeId
  app.get<{ Params: { employeeId: string } }>(
    '/progress/:employeeId',
    async (request: FastifyRequest<{ Params: { employeeId: string } }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const result = await pool.query(
        `SELECT gp.*, e.name as employee_name
         FROM goal_progress gp
         JOIN monthly_goals mg ON mg.id = gp.goal_id
         JOIN employees e ON e.id = gp.employee_id
         WHERE mg.company_id = $1 AND mg.month = date_trunc('month', CURRENT_DATE)::date AND gp.employee_id = $2`,
        [companyId, request.params.employeeId],
      );
      return reply.send({ success: true, data: result.rows[0] || null });
    },
  );

  // POST /goals
  app.post<{ Body: GoalBody }>(
    '/',
    async (request: FastifyRequest<{ Body: GoalBody }>, reply: FastifyReply) => {
      const role = request.employee.role;
      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }
      const companyId = request.companyId;
      const { month, goals } = request.body;

      if (!month || !goals || goals.length === 0) {
        return reply.code(400).send({ success: false, error: 'month and goals are required' });
      }

      const result = await pool.query(
        `INSERT INTO monthly_goals (company_id, month, goals, created_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id, month) DO UPDATE SET goals = $3, created_by = $4
         RETURNING *`,
        [companyId, month, JSON.stringify(goals), request.employee.id],
      );

      const goalId = (result.rows[0] as Record<string, unknown>).id as string;

      // Refresh progress for all reps
      try {
        await refreshAllProgress(companyId!, goalId);
      } catch {
        // Non-fatal
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

  // GET /goals/:month
  app.get<{ Params: { month: string } }>(
    '/:month',
    async (request: FastifyRequest<{ Params: { month: string } }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const result = await pool.query(
        `SELECT * FROM monthly_goals WHERE company_id = $1 AND month = $2`,
        [companyId, request.params.month],
      );
      return reply.send({ success: true, data: result.rows[0] || null });
    },
  );
}
