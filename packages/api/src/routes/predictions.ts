import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generatePredictions, getPredictionsForStore } from '../services/prediction.js';
import pool from '../db/pool.js';

interface StoreParams {
  storeId: string;
}

export async function predictionRoutes(app: FastifyInstance) {
  // POST /predictions/generate — trigger prediction generation (manager only)
  app.post(
    '/generate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const role = request.employee.role;
      if (role !== 'area_manager' && role !== 'regional_director' && role !== 'admin') {
        return reply.code(403).send({ success: false, error: 'Only managers can generate predictions' });
      }

      const companyId = request.companyId!;
      const result = await generatePredictions(companyId);

      return reply.send({ success: true, data: result });
    },
  );

  // GET /predictions/store/:storeId — predictions for a specific store
  app.get<{ Params: StoreParams }>(
    '/store/:storeId',
    async (request: FastifyRequest<{ Params: StoreParams }>, reply: FastifyReply) => {
      const companyId = request.companyId!;
      const predictions = await getPredictionsForStore(request.params.storeId, companyId);

      return reply.send({ success: true, data: predictions });
    },
  );

  // GET /predictions/at-risk — stores with predicted stockouts in next 7 days
  app.get(
    '/at-risk',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const companyId = request.companyId;

      const result = await pool.query(
        `SELECT ip.id, ip.store_id, ip.product_id,
                ip.predicted_stockout_date, ip.confidence,
                ip.recommended_revisit_date, ip.model_version, ip.created_at,
                p.name as product_name, p.name_zh as product_name_zh,
                s.name as store_name, s.name_zh as store_name_zh, s.tier
         FROM inventory_predictions ip
         JOIN products p ON p.id = ip.product_id
         JOIN stores s ON s.id = ip.store_id
         WHERE s.company_id = $1
           AND ip.predicted_stockout_date >= CURRENT_DATE
           AND ip.predicted_stockout_date <= CURRENT_DATE + 7
         ORDER BY ip.predicted_stockout_date ASC, ip.confidence DESC`,
        [companyId],
      );

      return reply.send({ success: true, data: result.rows });
    },
  );
}
