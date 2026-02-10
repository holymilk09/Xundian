import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';
import { generateShelfDiff } from '../services/shelfDiff.js';

interface ShelfDiffQuerystring {
  page?: string;
  limit?: string;
  severity?: string;
  reviewed?: string;
  store_id?: string;
}

interface ShelfDiffParams {
  id: string;
}

interface CreateShelfDiffBody {
  store_id: string;
  current_photo_id: string;
  previous_photo_id: string;
}

export async function shelfDiffRoutes(app: FastifyInstance) {
  // GET /shelf-diffs — list shelf comparisons for company
  app.get<{ Querystring: ShelfDiffQuerystring }>(
    '/',
    async (request: FastifyRequest<{ Querystring: ShelfDiffQuerystring }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const page = Math.max(1, parseInt(request.query.page || '1', 10));
      const limit = Math.min(50, Math.max(1, parseInt(request.query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      const conditions: string[] = ['s.company_id = $1'];
      const params: unknown[] = [companyId];
      let paramIndex = 2;

      if (request.query.severity) {
        conditions.push(`sc.severity = $${paramIndex}`);
        params.push(request.query.severity);
        paramIndex++;
      }

      if (request.query.reviewed !== undefined) {
        conditions.push(`sc.reviewed = $${paramIndex}`);
        params.push(request.query.reviewed === 'true');
        paramIndex++;
      }

      if (request.query.store_id) {
        conditions.push(`sc.store_id = $${paramIndex}`);
        params.push(request.query.store_id);
        paramIndex++;
      }

      const where = conditions.join(' AND ');

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM shelf_comparisons sc
         JOIN stores s ON s.id = sc.store_id
         WHERE ${where}`,
        params,
      );
      const total = parseInt(countResult.rows[0]!.count, 10);

      params.push(limit, offset);
      const result = await pool.query(
        `SELECT sc.id, sc.store_id, sc.current_photo_id, sc.previous_photo_id,
                sc.diff_result, sc.severity, sc.confidence, sc.reviewed, sc.reviewed_by,
                sc.created_at,
                s.name as store_name, s.name_zh as store_name_zh, s.tier as store_tier
         FROM shelf_comparisons sc
         JOIN stores s ON s.id = sc.store_id
         WHERE ${where}
         ORDER BY sc.created_at DESC
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

  // GET /shelf-diffs/:id — single shelf comparison detail
  app.get<{ Params: ShelfDiffParams }>(
    '/:id',
    async (request: FastifyRequest<{ Params: ShelfDiffParams }>, reply: FastifyReply) => {
      const companyId = request.companyId;

      const result = await pool.query(
        `SELECT sc.id, sc.store_id, sc.current_photo_id, sc.previous_photo_id,
                sc.diff_result, sc.severity, sc.confidence, sc.reviewed, sc.reviewed_by,
                sc.created_at,
                s.name as store_name, s.name_zh as store_name_zh, s.tier as store_tier,
                s.address as store_address,
                cp.photo_url as current_photo_url, cp.ai_analysis as current_analysis,
                pp.photo_url as previous_photo_url, pp.ai_analysis as previous_analysis
         FROM shelf_comparisons sc
         JOIN stores s ON s.id = sc.store_id
         JOIN visit_photos cp ON cp.id = sc.current_photo_id
         JOIN visit_photos pp ON pp.id = sc.previous_photo_id
         WHERE sc.id = $1 AND s.company_id = $2`,
        [request.params.id, companyId],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Shelf comparison not found' });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

  // POST /shelf-diffs — create a new shelf comparison (trigger AI diff)
  app.post<{ Body: CreateShelfDiffBody }>(
    '/',
    async (request: FastifyRequest<{ Body: CreateShelfDiffBody }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const { store_id, current_photo_id, previous_photo_id } = request.body;

      if (!store_id || !current_photo_id || !previous_photo_id) {
        return reply.code(400).send({
          success: false,
          error: 'store_id, current_photo_id, and previous_photo_id are required',
        });
      }

      // Verify store belongs to company
      const storeCheck = await pool.query(
        'SELECT id FROM stores WHERE id = $1 AND company_id = $2',
        [store_id, companyId],
      );
      if (storeCheck.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Store not found' });
      }

      // Generate diff
      const { diff_result, severity, confidence } = await generateShelfDiff(
        current_photo_id,
        previous_photo_id,
      );

      const result = await pool.query(
        `INSERT INTO shelf_comparisons (store_id, current_photo_id, previous_photo_id, diff_result, severity, confidence)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [store_id, current_photo_id, previous_photo_id, JSON.stringify(diff_result), severity, confidence],
      );

      return reply.code(201).send({ success: true, data: result.rows[0] });
    },
  );

  // POST /shelf-diffs/:id/review — mark as reviewed
  app.post<{ Params: ShelfDiffParams }>(
    '/:id/review',
    async (request: FastifyRequest<{ Params: ShelfDiffParams }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const role = request.employee.role;

      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

      const result = await pool.query(
        `UPDATE shelf_comparisons sc SET reviewed = true, reviewed_by = $2
         FROM stores s
         WHERE sc.id = $1 AND sc.store_id = s.id AND s.company_id = $3
         RETURNING sc.id, sc.reviewed, sc.reviewed_by`,
        [request.params.id, request.employee.id, companyId],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Shelf comparison not found' });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );
}
