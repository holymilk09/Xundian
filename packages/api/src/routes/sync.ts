import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';
import type { SyncPushRequest } from '@xundian/shared';

interface SyncPullBody {
  last_pulled_at: number | null;
}

const SYNCABLE_TABLES = ['stores', 'visits', 'visit_photos', 'products', 'revisit_schedule'] as const;

export async function syncRoutes(app: FastifyInstance) {
  // POST /sync/pull — WatermelonDB pull sync
  app.post<{ Body: SyncPullBody }>(
    '/pull',
    async (request: FastifyRequest<{ Body: SyncPullBody }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const lastPulledAt = request.body.last_pulled_at;
      const timestamp = Date.now();

      const changes: Record<string, { created: Record<string, unknown>[]; updated: Record<string, unknown>[]; deleted: string[] }> = {};

      for (const table of SYNCABLE_TABLES) {
        if (!lastPulledAt) {
          // First sync: return all records as created
          const result = await pool.query(
            `SELECT * FROM ${table} WHERE company_id = $1`,
            [companyId],
          );
          changes[table] = {
            created: result.rows,
            updated: [],
            deleted: [],
          };
        } else {
          const since = new Date(lastPulledAt).toISOString();

          // Get created records (created_at > lastPulledAt)
          const created = await pool.query(
            `SELECT * FROM ${table} WHERE company_id = $1 AND created_at > $2`,
            [companyId, since],
          );

          // Get updated records (updated_at > lastPulledAt AND created_at <= lastPulledAt)
          // Only tables with updated_at column
          let updated: { rows: Record<string, unknown>[] } = { rows: [] };
          if (table === 'stores') {
            updated = await pool.query(
              `SELECT * FROM ${table} WHERE company_id = $1 AND updated_at > $2 AND created_at <= $2`,
              [companyId, since],
            );
          }

          changes[table] = {
            created: created.rows,
            updated: updated.rows,
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
              await client.query(
                `INSERT INTO visits (id, company_id, store_id, employee_id, checked_in_at, gps_lat, gps_lng, gps_accuracy_m, stock_status, notes, duration_minutes, is_audit, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 ON CONFLICT (id) DO NOTHING`,
                [rec['id'], companyId, rec['store_id'], rec['employee_id'], rec['checked_in_at'], rec['gps_lat'], rec['gps_lng'], rec['gps_accuracy_m'], rec['stock_status'], rec['notes'], rec['duration_minutes'], rec['is_audit'] || false, rec['created_at'] || new Date().toISOString()],
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
            await client.query(
              `DELETE FROM ${table} WHERE id = $1 AND company_id = $2`,
              [id, companyId],
            );
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
