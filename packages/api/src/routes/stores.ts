import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';
import type { StoreTier, StoreType } from '@xundian/shared';

interface StoreQuerystring {
  page?: string;
  limit?: string;
  tier?: StoreTier;
  store_type?: StoreType;
  search?: string;
}

interface StoreParams {
  id: string;
}

interface NearbyQuerystring {
  lat: string;
  lng: string;
  radius_m?: string;
}

interface CreateStoreBody {
  name: string;
  name_zh?: string;
  latitude: number;
  longitude: number;
  address?: string;
  tier: StoreTier;
  store_type: StoreType;
  contact_name?: string;
  contact_phone?: string;
  gaode_poi_id?: string;
}

export async function storeRoutes(app: FastifyInstance) {
  // GET /stores — list stores for company (paginated)
  app.get<{ Querystring: StoreQuerystring }>(
    '/',
    async (request: FastifyRequest<{ Querystring: StoreQuerystring }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const page = Math.max(1, parseInt(request.query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      const conditions: string[] = ['s.company_id = $1'];
      const params: unknown[] = [companyId];
      let paramIndex = 2;

      if (request.query.tier) {
        conditions.push(`s.tier = $${paramIndex}`);
        params.push(request.query.tier);
        paramIndex++;
      }

      if (request.query.store_type) {
        conditions.push(`s.store_type = $${paramIndex}`);
        params.push(request.query.store_type);
        paramIndex++;
      }

      if (request.query.search) {
        conditions.push(`(s.name ILIKE $${paramIndex} OR s.name_zh ILIKE $${paramIndex})`);
        params.push(`%${request.query.search}%`);
        paramIndex++;
      }

      const where = conditions.join(' AND ');

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM stores s WHERE ${where}`,
        params,
      );
      const total = parseInt(countResult.rows[0]!.count, 10);

      params.push(limit, offset);
      const result = await pool.query(
        `SELECT s.id, s.company_id, s.name, s.name_zh,
                ST_Y(s.location) as latitude, ST_X(s.location) as longitude,
                s.address, s.tier, s.store_type, s.contact_name, s.contact_phone,
                s.gaode_poi_id, s.discovered_by, s.created_at, s.updated_at
         FROM stores s
         WHERE ${where}
         ORDER BY s.created_at DESC
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

  // GET /stores/nearby — query by lat/lng/radius using PostGIS
  app.get<{ Querystring: NearbyQuerystring }>(
    '/nearby',
    async (request: FastifyRequest<{ Querystring: NearbyQuerystring }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const lat = parseFloat(request.query.lat);
      const lng = parseFloat(request.query.lng);
      const radiusM = parseInt(request.query.radius_m || '2000', 10);

      if (isNaN(lat) || isNaN(lng)) {
        return reply.code(400).send({ success: false, error: 'lat and lng are required' });
      }

      const result = await pool.query(
        `SELECT s.id, s.company_id, s.name, s.name_zh,
                ST_Y(s.location) as latitude, ST_X(s.location) as longitude,
                s.address, s.tier, s.store_type, s.contact_name, s.contact_phone,
                s.gaode_poi_id, s.discovered_by, s.created_at, s.updated_at,
                ST_Distance(s.location::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) as distance_m
         FROM stores s
         WHERE s.company_id = $3
           AND ST_DWithin(s.location::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $4)
         ORDER BY distance_m ASC`,
        [lat, lng, companyId, radiusM],
      );

      return reply.send({ success: true, data: result.rows });
    },
  );

  // GET /stores/:id — store detail with last visit
  app.get<{ Params: StoreParams }>(
    '/:id',
    async (request: FastifyRequest<{ Params: StoreParams }>, reply: FastifyReply) => {
      const companyId = request.companyId;

      const result = await pool.query(
        `SELECT s.id, s.company_id, s.name, s.name_zh,
                ST_Y(s.location) as latitude, ST_X(s.location) as longitude,
                s.address, s.tier, s.store_type, s.contact_name, s.contact_phone,
                s.gaode_poi_id, s.discovered_by, s.created_at, s.updated_at
         FROM stores s
         WHERE s.id = $1 AND s.company_id = $2`,
        [request.params.id, companyId],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Store not found' });
      }

      const store = result.rows[0];

      // Get last visit
      const lastVisitResult = await pool.query(
        `SELECT v.id, v.checked_in_at, v.stock_status, v.notes, v.duration_minutes,
                e.name as employee_name
         FROM visits v
         JOIN employees e ON e.id = v.employee_id
         WHERE v.store_id = $1 AND v.company_id = $2
         ORDER BY v.checked_in_at DESC LIMIT 1`,
        [request.params.id, companyId],
      );

      return reply.send({
        success: true,
        data: {
          ...store,
          last_visit: lastVisitResult.rows[0] || null,
        },
      });
    },
  );

  // POST /stores — create store
  app.post<{ Body: CreateStoreBody }>(
    '/',
    async (request: FastifyRequest<{ Body: CreateStoreBody }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const { name, name_zh, latitude, longitude, address, tier, store_type, contact_name, contact_phone, gaode_poi_id } = request.body;

      if (!name || latitude == null || longitude == null || !tier || !store_type) {
        return reply.code(400).send({
          success: false,
          error: 'name, latitude, longitude, tier, and store_type are required',
        });
      }

      const result = await pool.query(
        `INSERT INTO stores (company_id, name, name_zh, location, address, tier, store_type, contact_name, contact_phone, gaode_poi_id, discovered_by)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, company_id, name, name_zh,
                   ST_Y(location) as latitude, ST_X(location) as longitude,
                   address, tier, store_type, contact_name, contact_phone,
                   gaode_poi_id, discovered_by, created_at, updated_at`,
        [companyId, name, name_zh || null, latitude, longitude, address || null, tier, store_type, contact_name || null, contact_phone || null, gaode_poi_id || null, request.employee.id],
      );

      return reply.code(201).send({ success: true, data: result.rows[0] });
    },
  );

  // PUT /stores/:id — update store
  app.put<{ Params: StoreParams; Body: Partial<CreateStoreBody> }>(
    '/:id',
    async (request: FastifyRequest<{ Params: StoreParams; Body: Partial<CreateStoreBody> }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const { name, name_zh, latitude, longitude, address, tier, store_type, contact_name, contact_phone, gaode_poi_id } = request.body;

      // Build dynamic update
      const sets: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (name !== undefined) { sets.push(`name = $${paramIndex++}`); params.push(name); }
      if (name_zh !== undefined) { sets.push(`name_zh = $${paramIndex++}`); params.push(name_zh); }
      if (latitude !== undefined && longitude !== undefined) {
        sets.push(`location = ST_SetSRID(ST_MakePoint($${paramIndex + 1}, $${paramIndex}), 4326)`);
        params.push(latitude, longitude);
        paramIndex += 2;
      }
      if (address !== undefined) { sets.push(`address = $${paramIndex++}`); params.push(address); }
      if (tier !== undefined) { sets.push(`tier = $${paramIndex++}`); params.push(tier); }
      if (store_type !== undefined) { sets.push(`store_type = $${paramIndex++}`); params.push(store_type); }
      if (contact_name !== undefined) { sets.push(`contact_name = $${paramIndex++}`); params.push(contact_name); }
      if (contact_phone !== undefined) { sets.push(`contact_phone = $${paramIndex++}`); params.push(contact_phone); }
      if (gaode_poi_id !== undefined) { sets.push(`gaode_poi_id = $${paramIndex++}`); params.push(gaode_poi_id); }

      if (sets.length === 0) {
        return reply.code(400).send({ success: false, error: 'No fields to update' });
      }

      sets.push(`updated_at = NOW()`);
      params.push(request.params.id, companyId);

      const result = await pool.query(
        `UPDATE stores SET ${sets.join(', ')}
         WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
         RETURNING id, company_id, name, name_zh,
                   ST_Y(location) as latitude, ST_X(location) as longitude,
                   address, tier, store_type, contact_name, contact_phone,
                   gaode_poi_id, discovered_by, created_at, updated_at`,
        params,
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Store not found' });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );
}
