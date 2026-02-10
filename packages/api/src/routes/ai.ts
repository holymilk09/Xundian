import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/pool.js';
import { processPhotoWithAI, submitPhotoForProcessing } from '../services/aiProxy.js';
import type { AIShelfAnalysis } from '@xundian/shared';

interface PhotoIdParams {
  photoId: string;
}

interface VisitIdParams {
  visitId: string;
}

interface WebhookBody {
  photo_id: string;
  analysis: AIShelfAnalysis;
}

export async function aiRoutes(app: FastifyInstance) {
  // POST /ai/webhook — receive results from on-prem AI kit (API key auth, no JWT)
  app.post(
    '/webhook',
    async (request: FastifyRequest<{ Body: WebhookBody }>, reply: FastifyReply) => {
      const apiKey = request.headers['x-api-key'];
      const expectedKey = process.env.AI_SERVER_API_KEY;

      if (!expectedKey || apiKey !== expectedKey) {
        return reply.code(401).send({ success: false, error: 'Invalid API key' });
      }

      const { photo_id, analysis } = request.body;

      if (!photo_id || !analysis) {
        return reply.code(400).send({ success: false, error: 'Missing photo_id or analysis' });
      }

      // Store the analysis
      const result = await pool.query(
        `UPDATE visit_photos SET ai_analysis = $1, ai_processed_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(analysis), photo_id],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Photo not found' });
      }

      return reply.send({ success: true, data: result.rows[0] });
    },
  );

  // POST /ai/process/:photoId — trigger AI processing for one photo
  app.post<{ Params: PhotoIdParams }>(
    '/process/:photoId',
    async (request: FastifyRequest<{ Params: PhotoIdParams }>, reply: FastifyReply) => {
      const { photoId } = request.params;
      const companyId = request.companyId;

      // Verify photo belongs to this company
      const photoCheck = await pool.query(
        `SELECT vp.id FROM visit_photos vp
         JOIN visits v ON v.id = vp.visit_id
         WHERE vp.id = $1 AND v.company_id = $2`,
        [photoId, companyId],
      );

      if (photoCheck.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Photo not found' });
      }

      const analysis = await processPhotoWithAI(photoId, companyId!);
      return reply.send({ success: true, data: analysis });
    },
  );

  // POST /ai/process-visit/:visitId — process all unanalyzed photos for a visit
  app.post<{ Params: VisitIdParams }>(
    '/process-visit/:visitId',
    async (request: FastifyRequest<{ Params: VisitIdParams }>, reply: FastifyReply) => {
      const { visitId } = request.params;
      const companyId = request.companyId!;

      // Verify visit belongs to this company
      const visitCheck = await pool.query(
        'SELECT id FROM visits WHERE id = $1 AND company_id = $2',
        [visitId, companyId],
      );

      if (visitCheck.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Visit not found' });
      }

      // Get all unanalyzed photos for this visit
      const photos = await pool.query(
        'SELECT id FROM visit_photos WHERE visit_id = $1 AND ai_analysis IS NULL',
        [visitId],
      );

      const results: { photo_id: string; analysis: AIShelfAnalysis }[] = [];

      for (const photo of photos.rows) {
        const analysis = await processPhotoWithAI(photo.id as string, companyId!);
        results.push({ photo_id: photo.id as string, analysis });
      }

      return reply.send({
        success: true,
        data: {
          processed: results.length,
          results,
        },
      });
    },
  );

  // POST /ai/process-batch — process all unanalyzed photos for company (manager only, LIMIT 50)
  app.post(
    '/process-batch',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.employee.role !== 'area_manager' && request.employee.role !== 'regional_director' && request.employee.role !== 'admin') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

      const companyId = request.companyId!;

      const photos = await pool.query(
        `SELECT vp.id FROM visit_photos vp
         JOIN visits v ON v.id = vp.visit_id
         WHERE v.company_id = $1 AND vp.ai_analysis IS NULL
         ORDER BY vp.created_at DESC
         LIMIT 50`,
        [companyId],
      );

      const results: { photo_id: string; analysis: AIShelfAnalysis }[] = [];

      for (const photo of photos.rows) {
        const analysis = await processPhotoWithAI(photo.id as string, companyId);
        results.push({ photo_id: photo.id as string, analysis });
      }

      return reply.send({
        success: true,
        data: {
          processed: results.length,
          results,
        },
      });
    },
  );

  // GET /ai/stats — AI processing statistics
  app.get(
    '/stats',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;

      const [processedResult, pendingResult, avgConfResult, recentResult, byDayResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) FROM visit_photos vp
           JOIN visits v ON v.id = vp.visit_id
           WHERE v.company_id = $1 AND vp.ai_analysis IS NOT NULL`,
          [companyId],
        ),
        pool.query(
          `SELECT COUNT(*) FROM visit_photos vp
           JOIN visits v ON v.id = vp.visit_id
           WHERE v.company_id = $1 AND vp.ai_analysis IS NULL`,
          [companyId],
        ),
        pool.query(
          `SELECT AVG((vp.ai_analysis->>'confidence')::numeric) as avg_confidence
           FROM visit_photos vp
           JOIN visits v ON v.id = vp.visit_id
           WHERE v.company_id = $1 AND vp.ai_analysis IS NOT NULL`,
          [companyId],
        ),
        pool.query(
          `SELECT vp.id as photo_id, s.name as store_name,
                  (vp.ai_analysis->>'share_of_shelf_percent')::numeric as share_of_shelf,
                  (vp.ai_analysis->>'confidence')::numeric as confidence,
                  vp.ai_processed_at as processed_at
           FROM visit_photos vp
           JOIN visits v ON v.id = vp.visit_id
           JOIN stores s ON s.id = v.store_id
           WHERE v.company_id = $1 AND vp.ai_analysis IS NOT NULL
           ORDER BY vp.ai_processed_at DESC
           LIMIT 10`,
          [companyId],
        ),
        pool.query(
          `SELECT DATE(vp.ai_processed_at) as date, COUNT(*) as count
           FROM visit_photos vp
           JOIN visits v ON v.id = vp.visit_id
           WHERE v.company_id = $1
             AND vp.ai_analysis IS NOT NULL
             AND vp.ai_processed_at > NOW() - INTERVAL '30 days'
           GROUP BY DATE(vp.ai_processed_at)
           ORDER BY date`,
          [companyId],
        ),
      ]);

      const avgConf = avgConfResult.rows[0]?.avg_confidence;

      return reply.send({
        success: true,
        data: {
          photos_processed: parseInt(processedResult.rows[0]!.count as string, 10),
          photos_pending: parseInt(pendingResult.rows[0]!.count as string, 10),
          avg_confidence: avgConf ? parseFloat(parseFloat(avgConf as string).toFixed(2)) : null,
          recent_analyses: recentResult.rows.map((r: Record<string, unknown>) => ({
            photo_id: r.photo_id,
            store_name: r.store_name,
            share_of_shelf: r.share_of_shelf ? parseFloat(r.share_of_shelf as string) : null,
            confidence: r.confidence ? parseFloat(r.confidence as string) : null,
            processed_at: r.processed_at,
          })),
          processing_by_day: byDayResult.rows.map((r: Record<string, unknown>) => ({
            date: r.date,
            count: parseInt(r.count as string, 10),
          })),
        },
      });
    },
  );

  // POST /ai/simulate/:visitId — force mock analysis regardless of AI_SERVER_URL (manager only)
  app.post<{ Params: VisitIdParams }>(
    '/simulate/:visitId',
    async (request: FastifyRequest<{ Params: VisitIdParams }>, reply: FastifyReply) => {
      if (request.employee.role !== 'area_manager' && request.employee.role !== 'regional_director' && request.employee.role !== 'admin') {
        return reply.code(403).send({ success: false, error: 'Manager role required' });
      }

      const { visitId } = request.params;
      const companyId = request.companyId!;

      // Verify visit belongs to this company
      const visitCheck = await pool.query(
        'SELECT id FROM visits WHERE id = $1 AND company_id = $2',
        [visitId, companyId],
      );

      if (visitCheck.rows.length === 0) {
        return reply.code(404).send({ success: false, error: 'Visit not found' });
      }

      // Get all photos for this visit (including already analyzed ones)
      const photos = await pool.query(
        'SELECT id FROM visit_photos WHERE visit_id = $1',
        [visitId],
      );

      const results: { photo_id: string; analysis: AIShelfAnalysis }[] = [];

      for (const photo of photos.rows) {
        const analysis = await processPhotoWithAI(photo.id as string, companyId, true);
        results.push({ photo_id: photo.id as string, analysis });
      }

      return reply.send({
        success: true,
        data: {
          processed: results.length,
          results,
        },
      });
    },
  );
}
