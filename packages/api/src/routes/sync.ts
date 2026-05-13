import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';
import type { SyncPushRequest } from '@xundian/shared';

interface SyncPullBody {
  last_pulled_at: number | null;
}

const SYNCABLE_TABLES = ['stores', 'visits', 'visit_photos'] as const;
type SyncableTable = typeof SYNCABLE_TABLES[number];

function toTimestamp(value: unknown): number | null {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value as string).getTime();
  return Number.isFinite(time) ? time : null;
}

function serializeSyncRow(table: SyncableTable, row: Record<string, unknown>): Record<string, unknown> {
  const raw = { ...row };

  if (table === 'visit_photos' && raw.ai_analysis && typeof raw.ai_analysis !== 'string') {
    raw.ai_analysis = JSON.stringify(raw.ai_analysis);
  }

  for (const key of ['created_at', 'updated_at', 'checked_in_at', 'ai_processed_at']) {
    if (key in raw) {
      raw[key] = toTimestamp(raw[key]);
    }
  }

  return raw;
}

async function selectCreatedRows(table: SyncableTable, companyId: string, since?: string) {
  if (table === 'stores') {
    const params = since ? [companyId, since] : [companyId];
    const condition = since ? 'AND created_at > $2' : '';
    return pool.query(
      `SELECT id, id AS server_id, company_id, name, name_zh,
              ST_Y(location) AS latitude, ST_X(location) AS longitude,
              address, tier, store_type, contact_name, contact_phone, gaode_poi_id,
              created_at, updated_at
       FROM stores
       WHERE company_id = $1 ${condition}`,
      params,
    );
  }

  if (table === 'visits') {
    const params = since ? [companyId, since] : [companyId];
    const condition = since ? 'AND created_at > $2' : '';
    return pool.query(
      `SELECT id, id AS server_id, company_id, store_id, employee_id, checked_in_at,
              gps_lat, gps_lng, gps_accuracy_m, stock_status, notes, duration_minutes,
              is_audit, created_at, created_at AS updated_at
       FROM visits
       WHERE company_id = $1 ${condition}`,
      params,
    );
  }

  const params = since ? [companyId, since] : [companyId];
  const condition = since ? 'AND vp.created_at > $2' : '';
  return pool.query(
    `SELECT vp.id, vp.id AS server_id, vp.visit_id, vp.photo_url, vp.photo_type,
            vp.ai_analysis, vp.ai_processed_at, vp.created_at, vp.created_at AS updated_at
     FROM visit_photos vp
     JOIN visits v ON v.id = vp.visit_id
     WHERE v.company_id = $1 ${condition}`,
    params,
  );
}

async function selectUpdatedRows(table: SyncableTable, companyId: string, since: string) {
  if (table !== 'stores') {
    return { rows: [] as Record<string, unknown>[] };
  }

  return pool.query(
    `SELECT id, id AS server_id, company_id, name, name_zh,
            ST_Y(location) AS latitude, ST_X(location) AS longitude,
            address, tier, store_type, contact_name, contact_phone, gaode_poi_id,
            created_at, updated_at
     FROM stores
     WHERE company_id = $1 AND updated_at > $2 AND created_at <= $2`,
    [companyId, since],
  );
}

export async function syncRoutes(app: FastifyInstance) {
  // POST /sync/pull — WatermelonDB pull sync
  app.post<{ Body: SyncPullBody }>(
    '/pull',
    async (request: FastifyRequest<{ Body: SyncPullBody }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      if (!companyId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }
      const lastPulledAt = request.body.last_pulled_at;
      const timestamp = Date.now();

      const changes: Record<string, { created: Record<string, unknown>[]; updated: Record<string, unknown>[]; deleted: string[] }> = {};

      // Table names are from compile-time constant SYNCABLE_TABLES — safe for interpolation
      for (const table of SYNCABLE_TABLES) {
        if (!lastPulledAt) {
          // First sync: return all records as created
          const result = await selectCreatedRows(table, companyId);
          changes[table] = {
            created: result.rows.map((row) => serializeSyncRow(table, row)),
            updated: [],
            deleted: [],
          };
        } else {
          const since = new Date(lastPulledAt).toISOString();

          // Get created records (created_at > lastPulledAt)
          const created = await selectCreatedRows(table, companyId, since);

          // Only stores currently support mutable offline fields.
          const updated = await selectUpdatedRows(table, companyId, since);

          changes[table] = {
            created: created.rows.map((row) => serializeSyncRow(table, row)),
            updated: updated.rows.map((row) => serializeSyncRow(table, row)),
            deleted: [], // Soft deletes not implemented yet
          };
        }
      }

      return reply.send({
        success: true,
        data: { changes, timestamp },
      });
    },
  );

  // POST /sync/push — WatermelonDB push sync
  app.post<{ Body: SyncPushRequest }>(
    '/push',
    async (request: FastifyRequest<{ Body: SyncPushRequest }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      if (!companyId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }
      const { changes } = request.body;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const [table, tableChanges] of Object.entries(changes)) {
          if (!SYNCABLE_TABLES.includes(table as typeof SYNCABLE_TABLES[number])) {
            continue;
          }

          // Handle created records
          for (const record of tableChanges.created) {
            const rec = record as Record<string, unknown>;
            rec['company_id'] = companyId;

            if (table === 'stores') {
              const lat = rec['latitude'] as number;
              const lng = rec['longitude'] as number;
              await client.query(
                `INSERT INTO stores (id, company_id, name, name_zh, location, address, tier, store_type, contact_name, contact_phone, gaode_poi_id, discovered_by, created_at)
                 VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($6, $5), 4326), $7, $8, $9, $10, $11, $12, $13, $14)
                 ON CONFLICT (id) DO NOTHING`,
                [rec['id'], companyId, rec['name'], rec['name_zh'], lat, lng, rec['address'], rec['tier'], rec['store_type'], rec['contact_name'], rec['contact_phone'], rec['gaode_poi_id'], rec['discovered_by'], rec['created_at'] || new Date().toISOString()],
              );
            } else if (table === 'visits') {
              const employeeId = rec['employee_id'] || request.employee.id;
              await client.query(
                `INSERT INTO visits (id, company_id, store_id, employee_id, checked_in_at, gps_lat, gps_lng, gps_accuracy_m, stock_status, notes, duration_minutes, is_audit, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 ON CONFLICT (id) DO NOTHING`,
                [rec['id'], companyId, rec['store_id'], employeeId, rec['checked_in_at'], rec['gps_lat'], rec['gps_lng'], rec['gps_accuracy_m'], rec['stock_status'], rec['notes'], rec['duration_minutes'], rec['is_audit'] || false, rec['created_at'] || new Date().toISOString()],
              );
            } else if (table === 'visit_photos') {
              await client.query(
                `INSERT INTO visit_photos (id, visit_id, photo_url, photo_type, created_at)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id) DO NOTHING`,
                [rec['id'], rec['visit_id'], rec['photo_url'], rec['photo_type'] || 'shelf', rec['created_at'] || new Date().toISOString()],
              );
            }
          }

          // Handle updated records
          for (const record of tableChanges.updated) {
            const rec = record as Record<string, unknown>;

            if (table === 'stores' && rec['id']) {
              const lat = rec['latitude'] as number;
              const lng = rec['longitude'] as number;
              await client.query(
                `UPDATE stores SET name = COALESCE($2, name), name_zh = COALESCE($3, name_zh),
                 location = COALESCE(ST_SetSRID(ST_MakePoint($5, $4), 4326), location),
                 address = COALESCE($6, address), tier = COALESCE($7, tier),
                 store_type = COALESCE($8, store_type), updated_at = NOW()
                 WHERE id = $1 AND company_id = $9`,
                [rec['id'], rec['name'], rec['name_zh'], lat, lng, rec['address'], rec['tier'], rec['store_type'], companyId],
              );
            }
          }

          // Handle deleted records
          for (const id of tableChanges.deleted) {
            if (table === 'stores') {
              await client.query('DELETE FROM stores WHERE id = $1 AND company_id = $2', [id, companyId]);
            } else if (table === 'visits') {
              await client.query('DELETE FROM visits WHERE id = $1 AND company_id = $2', [id, companyId]);
            } else if (table === 'visit_photos') {
              await client.query('DELETE FROM visit_photos WHERE id = $1 AND visit_id IN (SELECT id FROM visits WHERE company_id = $2)', [id, companyId]);
            } else if (table === 'products') {
              await client.query('DELETE FROM products WHERE id = $1 AND company_id = $2', [id, companyId]);
            } else if (table === 'revisit_schedule') {
              await client.query('DELETE FROM revisit_schedule WHERE id = $1 AND company_id = $2', [id, companyId]);
            }
          }
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      return reply.send({ success: true, data: null });
    },
  );
}
