import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';
import { optimizeRoute } from '../services/routing.js';
import type { RouteWaypoint } from '@xundian/shared';

interface OptimizeBody {
  start_lat: number;
  start_lng: number;
  date?: string;
  store_ids?: string[];
}

interface DateParams {
  date: string;
}

interface WaypointParams {
  id: string;
  sequence: string;
}

export async function routeRoutes(app: FastifyInstance) {
  // POST /routes — optimize route for the day
  app.post<{ Body: OptimizeBody }>(
    '/',
    async (request: FastifyRequest<{ Body: OptimizeBody }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const employeeId = request.employee.id;
      const { start_lat, start_lng, date, store_ids } = request.body;

      if (start_lat == null || start_lng == null) {
        return reply.code(400).send({
          success: false,
          error: 'start_lat and start_lng are required',
        });
      }

      const routeDate = date || new Date().toISOString().split('T')[0]!;

      // Run route optimization
      const result = await optimizeRoute(
        companyId!,
        employeeId,
        routeDate,
        start_lat,
        start_lng,
        store_ids,
      );

      // Upsert into daily_routes (ON CONFLICT employee_id + date DO UPDATE)
      const upsertResult = await pool.query(
        `INSERT INTO daily_routes (company_id, employee_id, date, waypoints, total_distance_km, estimated_duration_minutes, optimized)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (employee_id, date) DO UPDATE SET
           waypoints = $4,
           total_distance_km = $5,
           estimated_duration_minutes = $6,
           optimized = true,
           updated_at = NOW()
         RETURNING *`,
        [
          companyId,
          employeeId,
          routeDate,
          JSON.stringify(result.waypoints),
          result.total_distance_km,
          result.estimated_duration_minutes,
        ],
      );

      const route = upsertResult.rows[0]!;

      return reply.send({
        success: true,
        data: {
          ...route,
          waypoints: result.waypoints,
        },
      });
    },
  );

  // GET /routes/today — get current employee's route for today
  app.get(
    '/today',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;
      const employeeId = request.employee.id;

      const result = await pool.query(
        `SELECT * FROM daily_routes
         WHERE employee_id = $1 AND company_id = $2 AND date = CURRENT_DATE`,
        [employeeId, companyId],
      );

      if (result.rows.length === 0) {
        return reply.send({ success: true, data: null });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

  // GET /routes/:date — get route for a specific date (YYYY-MM-DD)
  app.get<{ Params: DateParams }>(
    '/:date',
    async (request: FastifyRequest<{ Params: DateParams }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const employeeId = request.employee.id;
      const { date } = request.params;

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD.',
        });
      }

      const result = await pool.query(
        `SELECT * FROM daily_routes
         WHERE employee_id = $1 AND company_id = $2 AND date = $3`,
        [employeeId, companyId, date],
      );

      if (result.rows.length === 0) {
        return reply.send({ success: true, data: null });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

  // GET /routes/team/today — manager view of all reps' routes for today
  app.get(
    '/team/today',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const role = request.employee.role;
      if (!['admin', 'area_manager', 'regional_director'].includes(role)) {
        return reply.code(403).send({ success: false, error: 'Manager access required' });
      }

      const companyId = request.companyId;

      const result = await pool.query(
        `SELECT dr.*, e.name as employee_name
         FROM daily_routes dr
         JOIN employees e ON e.id = dr.employee_id
         WHERE dr.company_id = $1 AND dr.date = CURRENT_DATE
         ORDER BY e.name`,
        [companyId],
      );

      return reply.send({ success: true, data: result.rows });
    },
  );

  // PATCH /routes/:id/waypoints/:sequence — mark a waypoint as visited
  app.patch<{ Params: WaypointParams }>(
    '/:id/waypoints/:sequence',
    async (request: FastifyRequest<{ Params: WaypointParams }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const employeeId = request.employee.id;
      const { id, sequence } = request.params;
      const sequenceNum = parseInt(sequence, 10);

      if (isNaN(sequenceNum)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid sequence number',
        });
      }

      // Fetch the route
      const routeResult = await pool.query(
        `SELECT * FROM daily_routes
         WHERE id = $1 AND company_id = $2 AND employee_id = $3`,
        [id, companyId, employeeId],
      );

      if (routeResult.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Route not found' });
      }

      const route = routeResult.rows[0]!;
      const waypoints: RouteWaypoint[] = route.waypoints as RouteWaypoint[];

      // Find and update the matching waypoint by sequence
      let found = false;
      for (const wp of waypoints) {
        if (wp.sequence === sequenceNum) {
          wp.visited = true;
          found = true;
          break;
        }
      }

      if (!found) {
        return reply.code(404).send({
          success: false,
          error: `Waypoint with sequence ${sequenceNum} not found`,
        });
      }

      // Write back the updated waypoints
      const updateResult = await pool.query(
        `UPDATE daily_routes
         SET waypoints = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(waypoints), id],
      );

      return reply.send({ success: true, data: updateResult.rows[0] });
    },
  );
}
