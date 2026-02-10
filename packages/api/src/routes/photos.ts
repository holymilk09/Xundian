import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool.js';
import type { PhotoType } from '@xundian/shared';
import { submitPhotoForProcessing } from '../services/aiProxy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

interface PhotoParams {
  visitId: string;
}

export async function photoRoutes(app: FastifyInstance) {
  // Ensure uploads directory exists
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  // POST /visits/:visitId/photos — upload photo
  app.post<{ Params: PhotoParams }>(
    '/visits/:visitId/photos',
    async (request: FastifyRequest<{ Params: PhotoParams }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const { visitId } = request.params;

      // Verify visit belongs to this company
      const visitResult = await pool.query(
        'SELECT id FROM visits WHERE id = $1 AND company_id = $2',
        [visitId, companyId],
      );

      if (visitResult.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Visit not found' });
      }

      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ success: false, error: 'No file uploaded' });
      }

      const photoType = (data.fields.photo_type as { value?: string } | undefined)?.value as PhotoType || 'shelf';
      const ext = path.extname(data.filename) || '.jpg';
      const filename = `${uuidv4()}${ext}`;
      const filepath = path.join(UPLOADS_DIR, filename);

      await pipeline(data.file, fs.createWriteStream(filepath));

      const photoUrl = `/uploads/${filename}`;

      const result = await pool.query(
        `INSERT INTO visit_photos (visit_id, photo_url, photo_type)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [visitId, photoUrl, photoType],
      );

      // Auto-process with AI if AI server is configured or auto_process requested
      const autoProcess = (data.fields.auto_process as { value?: string } | undefined)?.value === 'true';
      if (process.env.AI_SERVER_URL || autoProcess) {
        submitPhotoForProcessing(result.rows[0]!.id as string, companyId!);
      }

      return reply.code(201).send({ success: true, data: result.rows[0] });
    },
  );

  // GET /visits/:visitId/photos — list photos for a visit
  app.get<{ Params: PhotoParams }>(
    '/visits/:visitId/photos',
    async (request: FastifyRequest<{ Params: PhotoParams }>, reply: FastifyReply) => {
      const companyId = request.companyId;
      const { visitId } = request.params;

      // Verify visit belongs to this company
      const visitResult = await pool.query(
        'SELECT id FROM visits WHERE id = $1 AND company_id = $2',
        [visitId, companyId],
      );

      if (visitResult.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Visit not found' });
      }

      const result = await pool.query(
        'SELECT * FROM visit_photos WHERE visit_id = $1 ORDER BY created_at',
        [visitId],
      );

      return reply.send({ success: true, data: result.rows });
    },
  );
}
