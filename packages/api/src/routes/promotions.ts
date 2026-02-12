import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';

interface PromotionBody {
  title: string;
  title_zh?: string;
  description: string;
  description_zh?: string;
  display_instructions?: string;
  display_instructions_zh?: string;
  product_id?: string | null;
  target_tiers: string[];
  start_date: string;
  end_date: string;
}

export async function promotionRoutes(app: FastifyInstance) {
  // GET /promotions — list all promos with optional status filter
  app.get<{ Querystring: { status?: string } }>(
    '/',
    async (request: FastifyRequest<{ Querystring: { status?: string } }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const statusFilter = request.query.status || 'all';

      let query = `
        SELECT p.*, pr.name as product_name, pr.name_zh as product_name_zh,
          CASE WHEN p.is_active AND p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE THEN 'active'
               WHEN p.is_active AND p.start_date > CURRENT_DATE THEN 'upcoming'
               ELSE 'expired' END as status,
          GREATEST(0, p.end_date - CURRENT_DATE) as days_remaining
        FROM promotions p
        LEFT JOIN products pr ON pr.id = p.product_id
        WHERE p.company_id = $1`;

      const params: unknown[] = [companyId];

      if (statusFilter === 'active') {
        query += ` AND p.is_active AND p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE`;
      } else if (statusFilter === 'upcoming') {
        query += ` AND p.is_active AND p.start_date > CURRENT_DATE`;
      } else if (statusFilter === 'expired') {
        query += ` AND (NOT p.is_active OR p.end_date < CURRENT_DATE)`;
      }

      query += `
        ORDER BY
          CASE WHEN p.is_active AND p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE THEN 0
               WHEN p.is_active AND p.start_date > CURRENT_DATE THEN 1
               ELSE 2 END,
          p.start_date DESC`;

      const result = await pool.query(query, params);
      return reply.send({ success: true, data: result.rows });
    },
  );

  // GET /promotions/active — convenience endpoint for active promos only
  app.get('/active', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = request.companyId;
    const result = await pool.query(
      `SELECT p.*, pr.name as product_name, pr.name_zh as product_name_zh,
        'active' as status,
        GREATEST(0, p.end_date - CURRENT_DATE) as days_remaining
      FROM promotions p
      LEFT JOIN products pr ON pr.id = p.product_id
      WHERE p.company_id = $1 AND p.is_active
        AND p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE
      ORDER BY p.end_date ASC`,
      [companyId],
    );
    return reply.send({ success: true, data: result.rows });
  });

  // GET /promotions/store/:storeId — active promos matching a store's tier
  app.get<{ Params: { storeId: string } }>(
    '/store/:storeId',
    async (request: FastifyRequest<{ Params: { storeId: string } }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const { storeId } = request.params;

      const result = await pool.query(
        `SELECT p.*, pr.name as product_name, pr.name_zh as product_name_zh,
          'active' as status,
          GREATEST(0, p.end_date - CURRENT_DATE) as days_remaining
        FROM promotions p
        LEFT JOIN products pr ON pr.id = p.product_id
        WHERE p.company_id = $1 AND p.is_active
          AND p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE
          AND p.target_tiers @> ARRAY[(SELECT tier FROM stores WHERE id = $2)]::text[]
        ORDER BY p.end_date ASC`,
        [companyId, storeId],
      );
      return reply.send({ success: true, data: result.rows });
    },
  );

  // POST /promotions — create (manager only)
  app.post<{ Body: PromotionBody }>(
    '/',
    async (request: FastifyRequest<{ Body: PromotionBody }>, reply: FastifyReply) => {
      const role = request.employee.role;
      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

      const companyId = request.companyId;
      const { title, title_zh, description, description_zh, display_instructions, display_instructions_zh, product_id, target_tiers, start_date, end_date } = request.body;

      if (!title || !description || !start_date || !end_date) {
        return reply.code(400).send({ success: false, error: 'title, description, start_date, and end_date are required' });
      }

      const result = await pool.query(
        `INSERT INTO promotions (company_id, product_id, title, title_zh, description, description_zh, display_instructions, display_instructions_zh, target_tiers, start_date, end_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [companyId, product_id || null, title, title_zh || null, description, description_zh || null, display_instructions || null, display_instructions_zh || null, target_tiers || ['A', 'B', 'C'], start_date, end_date, request.employee.id],
      );

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

  // PUT /promotions/:id — update (manager only)
  app.put<{ Params: { id: string }; Body: Partial<PromotionBody> & { is_active?: boolean } }>(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string }; Body: Partial<PromotionBody> & { is_active?: boolean } }>, reply: FastifyReply) => {
      const role = request.employee.role;
      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

      const companyId = request.companyId;
      const { id } = request.params;
      const body = request.body;

      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const addField = (name: string, value: unknown) => {
        if (value !== undefined) {
          fields.push(`${name} = $${idx++}`);
          values.push(value);
        }
      };

      addField('title', body.title);
      addField('title_zh', body.title_zh);
      addField('description', body.description);
      addField('description_zh', body.description_zh);
      addField('display_instructions', body.display_instructions);
      addField('display_instructions_zh', body.display_instructions_zh);
      addField('product_id', body.product_id);
      addField('target_tiers', body.target_tiers);
      addField('start_date', body.start_date);
      addField('end_date', body.end_date);
      addField('is_active', body.is_active);

      if (fields.length === 0) {
        return reply.code(400).send({ success: false, error: 'No fields to update' });
      }

      values.push(id, companyId);
      const result = await pool.query(
        `UPDATE promotions SET ${fields.join(', ')} WHERE id = $${idx++} AND company_id = $${idx} RETURNING *`,
        values,
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Promotion not found' });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

  // DELETE /promotions/:id — soft delete (manager only)
  app.delete<{ Params: { id: string } }>(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const role = request.employee.role;
      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

      const companyId = request.companyId;
      const { id } = request.params;

      const result = await pool.query(
        `UPDATE promotions SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING *`,
        [id, companyId],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Promotion not found' });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );
}
