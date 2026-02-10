import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';
import { GPS_CONFIG } from '@xundian/shared';
import type { StockStatus } from '@xundian/shared';
import { scheduleNextRevisit } from '../services/scheduler.js';
import { checkVisitIntegrity } from '../services/integrity.js';

interface VisitQuerystring {
  page?: string;
  limit?: string;
  store_id?: string;
  employee_id?: string;
  from?: string;
  to?: string;
}

interface VisitParams {
  id: string;
}

interface CreateVisitBody {
  store_id: string;
  checked_in_at: string;
  gps_lat: number;
  gps_lng: number;
  gps_accuracy_m: number;
  stock_status: StockStatus;
  notes?: string;
  duration_minutes?: number;
  is_audit?: boolean;
}

// Haversine distance in meters
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function visitRoutes(app: FastifyInstance) {
  // GET /visits — list visits (paginated, filterable)
  app.get<{ Querystring: VisitQuerystring }>(
    '/',
    async (request: FastifyRequest<{ Querystring: VisitQuerystring }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const page = Math.max(1, parseInt(request.query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      const conditions: string[] = ['v.company_id = $1'];
      const params: unknown[] = [companyId];
      let paramIndex = 2;

      if (request.query.store_id) {
        conditions.push(`v.store_id = $${paramIndex}`);
        params.push(request.query.store_id);
        paramIndex++;
      }

      if (request.query.employee_id) {
        conditions.push(`v.employee_id = $${paramIndex}`);
        params.push(request.query.employee_id);
        paramIndex++;
      }

      if (request.query.from) {
        conditions.push(`v.checked_in_at >= $${paramIndex}`);
        params.push(request.query.from);
        paramIndex++;
      }

      if (request.query.to) {
        conditions.push(`v.checked_in_at <= $${paramIndex}`);
        params.push(request.query.to);
        paramIndex++;
      }

      const where = conditions.join(' AND ');

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM visits v WHERE ${where}`,
        params,
      );
      const total = parseInt(countResult.rows[0]!.count, 10);

      params.push(limit, offset);
      const result = await pool.query(
        `SELECT v.*, e.name as employee_name, s.name as store_name
         FROM visits v
         JOIN employees e ON e.id = v.employee_id
         JOIN stores s ON s.id = v.store_id
         WHERE ${where}
         ORDER BY v.checked_in_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params,
      );

      return reply.send({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      });
    },
  );

  // GET /visits/:id — visit detail with photos
  app.get<{ Params: VisitParams }>(
    '/:id',
    async (request: FastifyRequest<{ Params: VisitParams }>, reply: FastifyReply) => {
      const companyId = request.companyId;

      const result = await pool.query(
        `SELECT v.*, e.name as employee_name, s.name as store_name
         FROM visits v
         JOIN employees e ON e.id = v.employee_id
         JOIN stores s ON s.id = v.store_id
         WHERE v.id = $1 AND v.company_id = $2`,
        [request.params.id, companyId],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Visit not found' });
      }

      const photos = await pool.query(
        'SELECT * FROM visit_photos WHERE visit_id = $1 ORDER BY created_at',
        [request.params.id],
      );

      return reply.send({
        success: true,
        data: {
          ...result.rows[0],
          photos: photos.rows,
        },
      });
    },
  );

  // POST /visits — create visit with GPS anti-cheat
  app.post<{ Body: CreateVisitBody }>(
    '/',
    async (request: FastifyRequest<{ Body: CreateVisitBody }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const employeeId = request.employee.id;
      const { store_id, checked_in_at, gps_lat, gps_lng, gps_accuracy_m, stock_status, notes, duration_minutes, is_audit } = request.body;

      if (!store_id || !checked_in_at || gps_lat == null || gps_lng == null || gps_accuracy_m == null || !stock_status) {
        return reply.code(400).send({
          success: false,
          error: 'store_id, checked_in_at, gps_lat, gps_lng, gps_accuracy_m, and stock_status are required',
        });
      }

      // Anti-cheat: GPS accuracy check
      if (gps_accuracy_m > GPS_CONFIG.ACCURACY_THRESHOLD_M) {
        return reply.code(422).send({
          success: false,
          error: `GPS accuracy too low: ${gps_accuracy_m}m exceeds ${GPS_CONFIG.ACCURACY_THRESHOLD_M}m threshold`,
        });
      }

      // Anti-cheat: Timestamp drift check
      const clientTime = new Date(checked_in_at).getTime();
      const serverTime = Date.now();
      if (Math.abs(clientTime - serverTime) > GPS_CONFIG.TIMESTAMP_DRIFT_TOLERANCE_MS) {
        return reply.code(422).send({
          success: false,
          error: 'Timestamp drift exceeds 5 minute tolerance',
        });
      }

      // Get store location for geofence check
      const storeResult = await pool.query(
        `SELECT ST_Y(location) as latitude, ST_X(location) as longitude
         FROM stores WHERE id = $1 AND company_id = $2`,
        [store_id, companyId],
      );

      if (storeResult.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Store not found' });
      }

      const store = storeResult.rows[0]!;

      // Anti-cheat: Geofence check (must be within 200m)
      const distance = haversineDistance(gps_lat, gps_lng, parseFloat(store.latitude), parseFloat(store.longitude));
      if (distance > GPS_CONFIG.GEOFENCE_RADIUS_M) {
        return reply.code(422).send({
          success: false,
          error: `Too far from store: ${Math.round(distance)}m exceeds ${GPS_CONFIG.GEOFENCE_RADIUS_M}m geofence`,
        });
      }

      const result = await pool.query(
        `INSERT INTO visits (company_id, store_id, employee_id, checked_in_at, gps_lat, gps_lng, gps_accuracy_m, stock_status, notes, duration_minutes, is_audit)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [companyId, store_id, employeeId, checked_in_at, gps_lat, gps_lng, gps_accuracy_m, stock_status, notes || null, duration_minutes || null, is_audit || false],
      );

      // Fire-and-forget integrity check
      const newVisit = result.rows[0] as Record<string, unknown>;
      checkVisitIntegrity(companyId!, newVisit.id as string).catch((err) => {
        request.log.error({ err }, 'Integrity check failed');
      });

      // Schedule next revisit based on stock status
      try {
        await scheduleNextRevisit(companyId!, store_id, employeeId, stock_status);
      } catch (err) {
        // Log but don't fail the visit creation if scheduling fails
        request.log.error({ err }, 'Failed to schedule next revisit');
      }

      return reply.code(201).send({ success: true, data: result.rows[0] });
    },
  );
}
