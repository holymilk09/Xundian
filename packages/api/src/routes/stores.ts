import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';
import type { StoreTier, StoreType, ApprovalStatus } from '@xundian/shared';
import { discoverNearbyStores } from '../services/discovery.js';
import { createNotification } from '../services/notifications.js';
import { scheduleNextRevisit } from '../services/scheduler.js';

interface StoreQuerystring {
  page?: string;
  limit?: string;
  tier?: StoreTier;
  store_type?: StoreType;
  search?: string;
  approval_status?: ApprovalStatus;
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

interface DiscoverStoreBody {
  name: string;
  name_zh?: string;
  latitude: number;
  longitude: number;
  address?: string;
  tier?: StoreTier;
  store_type: StoreType;
  contact_name?: string;
  contact_phone?: string;
  notes?: string;
  storefront_photo_url?: string;
  gps_accuracy_m?: number;
}

interface ApproveStoreBody {
  tier?: StoreTier;
  store_type?: StoreType;
  name?: string;
  name_zh?: string;
}

interface RejectStoreBody {
  reason?: string;
}

export async function storeRoutes(app: FastifyInstance) {
  // GET /stores/map — all stores with coordinates for map visualization
  app.get(
    '/map',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;

      const result = await pool.query(
        `SELECT s.id, s.name, s.name_zh, s.tier, s.store_type, s.address,
                ST_Y(s.location) as latitude, ST_X(s.location) as longitude,
                s.approval_status, s.discovered_at,
                lv.checked_in_at as last_visit_at,
                lv.stock_status as last_stock_status,
                nr.next_visit_date as next_revisit_date
         FROM stores s
         LEFT JOIN LATERAL (
           SELECT v.checked_in_at, v.stock_status
           FROM visits v
           WHERE v.store_id = s.id AND v.company_id = s.company_id
           ORDER BY v.checked_in_at DESC LIMIT 1
         ) lv ON true
         LEFT JOIN LATERAL (
           SELECT rs.next_visit_date
           FROM revisit_schedule rs
           WHERE rs.store_id = s.id AND rs.company_id = s.company_id AND NOT rs.completed
           ORDER BY rs.next_visit_date ASC LIMIT 1
         ) nr ON true
         WHERE s.company_id = $1
         ORDER BY s.created_at DESC`,
        [companyId],
      );

      return reply.send({ success: true, data: result.rows });
    },
  );

  // GET /stores/pending — manager-only: pending approval stores
  app.get(
    '/pending',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;
      const role = request.employee.role;

      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

      const result = await pool.query(
        `SELECT s.id, s.name, s.name_zh, s.tier, s.store_type, s.address,
                ST_Y(s.location) as latitude, ST_X(s.location) as longitude,
                s.discovered_by, s.discovered_at, s.storefront_photo_url, s.notes,
                s.contact_name, s.contact_phone,
                e.name as discoverer_name
         FROM stores s
         LEFT JOIN employees e ON e.id = s.discovered_by
         WHERE s.company_id = $1 AND s.approval_status = 'pending'
         ORDER BY s.discovered_at DESC`,
        [companyId],
      );

      return reply.send({ success: true, data: result.rows });
    },
  );

  // POST /stores/discover — rep onboarding: submit a new store for approval
  app.post<{ Body: DiscoverStoreBody }>(
    '/discover',
    async (request: FastifyRequest<{ Body: DiscoverStoreBody }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const employeeId = request.employee.id;
      const { name, name_zh, latitude, longitude, address, tier, store_type, contact_name, contact_phone, notes, storefront_photo_url, gps_accuracy_m } = request.body;

      if (!name || latitude == null || longitude == null || !store_type) {
        return reply.code(400).send({
          success: false,
          error: 'name, latitude, longitude, and store_type are required',
        });
      }

      // Anti-cheat: GPS accuracy check
      if (gps_accuracy_m != null && gps_accuracy_m > 100) {
        return reply.code(400).send({
          success: false,
          error: 'GPS accuracy too low (>100m). Please move to a location with better signal.',
        });
      }

      // Anti-cheat: duplicate detection (exact name match within 200m)
      const dupResult = await pool.query(
        `SELECT id, name FROM stores
         WHERE company_id = $1
           AND LOWER(name) = LOWER($2)
           AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, 200)`,
        [companyId, name, latitude, longitude],
      );

      if (dupResult.rows.length > 0) {
        return reply.code(409).send({
          success: false,
          error: `A similar store already exists nearby: ${(dupResult.rows[0] as Record<string, unknown>).name}`,
        });
      }

      // Anti-cheat: rate limit (>10 discoveries/day)
      const todayCount = await pool.query(
        `SELECT COUNT(*) FROM stores
         WHERE company_id = $1 AND discovered_by = $2
           AND discovered_at >= CURRENT_DATE`,
        [companyId, employeeId],
      );
      if (parseInt((todayCount.rows[0] as Record<string, unknown>).count as string, 10) >= 10) {
        return reply.code(429).send({
          success: false,
          error: 'Daily discovery limit reached (10 stores/day)',
        });
      }

      const result = await pool.query(
        `INSERT INTO stores (company_id, name, name_zh, location, address, tier, store_type,
                             contact_name, contact_phone, notes, storefront_photo_url,
                             discovered_by, discovered_at, approval_status)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6, $7, $8,
                 $9, $10, $11, $12, $13, NOW(), 'pending')
         RETURNING id, company_id, name, name_zh,
                   ST_Y(location) as latitude, ST_X(location) as longitude,
                   address, tier, store_type, contact_name, contact_phone,
                   discovered_by, discovered_at, approval_status, notes, storefront_photo_url,
                   created_at, updated_at`,
        [companyId, name, name_zh || null, latitude, longitude, address || null,
         tier || 'C', store_type, contact_name || null, contact_phone || null,
         notes || null, storefront_photo_url || null, employeeId],
      );

      const newStore = result.rows[0] as Record<string, unknown>;

      // Get rep name for notification
      const repResult = await pool.query(
        `SELECT name FROM employees WHERE id = $1`,
        [employeeId],
      );
      const repName = repResult.rows.length > 0 ? (repResult.rows[0] as Record<string, unknown>).name as string : 'A rep';

      // Notify all active managers about the new discovery
      const managersResult = await pool.query(
        `SELECT id FROM employees
         WHERE company_id = $1 AND is_active = true
           AND role IN ('admin', 'area_manager', 'regional_director')`,
        [companyId],
      );

      for (const manager of managersResult.rows) {
        await createNotification({
          company_id: companyId!,
          employee_id: (manager as Record<string, unknown>).id as string,
          type: 'store_discovered',
          title: `New Store Discovered: ${name}`,
          message: `${repName} discovered a new store: ${name}. Review and approve in the pending queue.`,
          store_id: newStore.id as string,
        });
      }

      return reply.code(201).send({ success: true, data: newStore });
    },
  );

  // POST /stores/:id/approve — manager-only: approve a pending store
  app.post<{ Params: StoreParams; Body: ApproveStoreBody }>(
    '/:id/approve',
    async (request: FastifyRequest<{ Params: StoreParams; Body: ApproveStoreBody }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const role = request.employee.role;

      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

      const { tier, store_type, name, name_zh } = request.body || {};

      // Build dynamic updates for optional edits
      const sets: string[] = [
        `approval_status = 'approved'`,
        `approved_by = $2`,
        `approved_at = NOW()`,
      ];
      const params: unknown[] = [request.params.id, request.employee.id];
      let paramIndex = 3;

      if (tier) { sets.push(`tier = $${paramIndex++}`); params.push(tier); }
      if (store_type) { sets.push(`store_type = $${paramIndex++}`); params.push(store_type); }
      if (name) { sets.push(`name = $${paramIndex++}`); params.push(name); }
      if (name_zh) { sets.push(`name_zh = $${paramIndex++}`); params.push(name_zh); }

      params.push(companyId);

      const result = await pool.query(
        `UPDATE stores SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $1 AND company_id = $${paramIndex} AND approval_status = 'pending'
         RETURNING id, company_id, name, name_zh,
                   ST_Y(location) as latitude, ST_X(location) as longitude,
                   address, tier, store_type, approval_status, approved_by, approved_at,
                   discovered_by, discovered_at, created_at, updated_at`,
        params,
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Store not found or not pending' });
      }

      const store = result.rows[0] as Record<string, unknown>;

      // Auto-create revisit schedule for the newly approved store
      try {
        await scheduleNextRevisit(
          companyId!,
          store.id as string,
          (store.discovered_by as string) || request.employee.id,
          'in_stock',
        );
      } catch (err) {
        app.log.warn({ err }, 'Revisit schedule failed for approved store');
      }

      return reply.send({ success: true, data: store });
    },
  );

  // POST /stores/:id/reject — manager-only: reject a pending store
  app.post<{ Params: StoreParams; Body: RejectStoreBody }>(
    '/:id/reject',
    async (request: FastifyRequest<{ Params: StoreParams; Body: RejectStoreBody }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const role = request.employee.role;

      if (role !== 'admin' && role !== 'area_manager' && role !== 'regional_director') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

      const { reason } = request.body || {};

      const result = await pool.query(
        `UPDATE stores SET approval_status = 'rejected', notes = COALESCE($3, notes), updated_at = NOW()
         WHERE id = $1 AND company_id = $2 AND approval_status = 'pending'
         RETURNING id, name, approval_status`,
        [request.params.id, companyId, reason || null],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Store not found or not pending' });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

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

      // Default: only show approved stores unless explicitly filtering
      if (request.query.approval_status) {
        conditions.push(`s.approval_status = $${paramIndex}`);
        params.push(request.query.approval_status);
        paramIndex++;
      } else {
        conditions.push(`(s.approval_status = 'approved' OR s.approval_status IS NULL)`);
      }

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
                s.gaode_poi_id, s.discovered_by, s.approval_status, s.created_at, s.updated_at,
                lv.checked_in_at as last_visit_at,
                lv.stock_status as last_stock_status
         FROM stores s
         LEFT JOIN LATERAL (
           SELECT v.checked_in_at, v.stock_status
           FROM visits v
           WHERE v.store_id = s.id AND v.company_id = s.company_id
           ORDER BY v.checked_in_at DESC LIMIT 1
         ) lv ON true
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

  // GET /stores/discover — discover new stores via Gaode POI or mock data
  app.get<{ Querystring: NearbyQuerystring }>(
    '/discover',
    async (request: FastifyRequest<{ Querystring: NearbyQuerystring }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const lat = parseFloat(request.query.lat);
      const lng = parseFloat(request.query.lng);
      const radiusM = parseInt(request.query.radius_m || '2000', 10);

      if (isNaN(lat) || isNaN(lng)) {
        return reply.code(400).send({ success: false, error: 'lat and lng are required' });
      }

      const results = await discoverNearbyStores(companyId!, lat, lng, radiusM);

      return reply.send({ success: true, data: results });
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
                s.gaode_poi_id, s.discovered_by, s.created_at, s.updated_at,
                s.approval_status, s.discovered_at, s.storefront_photo_url,
                s.approved_by, s.approved_at, s.notes,
                disc.name as discoverer_name
         FROM stores s
         LEFT JOIN employees disc ON disc.id = s.discovered_by
         WHERE s.id = $1 AND s.company_id = $2`,
        [request.params.id, companyId],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Store not found' });
      }

      const store = result.rows[0];

      // Get recent visits (first row doubles as last_visit)
      const recentVisitsResult = await pool.query(
        `SELECT v.id, v.checked_in_at, v.stock_status, v.notes, v.duration_minutes,
                e.name as employee_name
         FROM visits v
         JOIN employees e ON e.id = v.employee_id
         WHERE v.store_id = $1 AND v.company_id = $2
         ORDER BY v.checked_in_at DESC LIMIT 10`,
        [request.params.id, companyId],
      );

      // Get latest AI analysis
      const aiAnalysisResult = await pool.query(
        `SELECT vp.id, vp.photo_url, vp.photo_type, vp.ai_analysis, vp.ai_processed_at, vp.created_at
         FROM visit_photos vp
         JOIN visits v ON v.id = vp.visit_id
         WHERE v.store_id = $1 AND v.company_id = $2
         AND vp.ai_analysis IS NOT NULL
         ORDER BY vp.created_at DESC LIMIT 1`,
        [request.params.id, companyId],
      );

      return reply.send({
        success: true,
        data: {
          ...store,
          last_visit: recentVisitsResult.rows[0] || null,
          recent_visits: recentVisitsResult.rows,
          latest_ai_analysis: aiAnalysisResult.rows[0] || null,
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
        `INSERT INTO stores (company_id, name, name_zh, location, address, tier, store_type, contact_name, contact_phone, gaode_poi_id, discovered_by, discovered_at, approval_status, approved_at)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6, $7, $8, $9, $10, $11, $12, NOW(), 'approved', NOW())
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
