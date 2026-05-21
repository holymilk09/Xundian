import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { convertCoordinatesToGaode, getGaodeReadiness } from '../services/gaode.js';

interface ConvertBody {
  points: Array<{ lat: number; lng: number }>;
  coordsys?: 'gps' | 'mapbar' | 'baidu' | 'autonavi';
}

export async function mapRoutes(app: FastifyInstance) {
  // GET /maps/config — authenticated readiness/config summary for clients
  app.get('/config', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: {
        ...getGaodeReadiness(),
        js_key: process.env.GAODE_JS_KEY || process.env.NEXT_PUBLIC_GAODE_JS_KEY || null,
      },
    });
  });

  // POST /maps/convert — convert GPS/mapbar/Baidu coordinates to Gaode GCJ-02
  app.post<{ Body: ConvertBody }>(
    '/convert',
    async (request: FastifyRequest<{ Body: ConvertBody }>, reply: FastifyReply) => {
      const points = request.body?.points || [];
      if (!Array.isArray(points) || points.length === 0 || points.length > 40) {
        return reply.code(400).send({
          success: false,
          error: 'points must contain 1-40 coordinate pairs',
        });
      }

      const invalid = points.some((point) =>
        !Number.isFinite(point.lat) ||
        !Number.isFinite(point.lng) ||
        Math.abs(point.lat) > 90 ||
        Math.abs(point.lng) > 180,
      );
      if (invalid) {
        return reply.code(400).send({ success: false, error: 'Invalid coordinate pair' });
      }

      const converted = await convertCoordinatesToGaode(points, request.body.coordsys || 'gps');
      return reply.send({ success: true, data: converted });
    },
  );
}
