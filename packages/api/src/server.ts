import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { authPlugin } from './middleware/auth.js';
import { tenantPlugin } from './middleware/tenant.js';
import { authRoutes } from './routes/auth.js';
import { storeRoutes } from './routes/stores.js';
import { visitRoutes } from './routes/visits.js';
import { photoRoutes } from './routes/photos.js';
import { companyRoutes } from './routes/companies.js';
import { syncRoutes } from './routes/sync.js';
import { analyticsRoutes } from './routes/analytics.js';
import { alertRoutes } from './routes/alerts.js';
import { routeRoutes } from './routes/routes.js';
import { notificationRoutes } from './routes/notifications.js';
import { aiRoutes } from './routes/ai.js';
import { predictionRoutes } from './routes/predictions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register plugins
await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

await app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Serve uploaded files statically
await app.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'uploads'),
  prefix: '/uploads/',
  decorateReply: false,
});

// Register middleware
await app.register(authPlugin);
await app.register(tenantPlugin);

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
await app.register(authRoutes, { prefix: '/auth' });
await app.register(storeRoutes, { prefix: '/stores' });
await app.register(visitRoutes, { prefix: '/visits' });
await app.register(photoRoutes);
await app.register(companyRoutes, { prefix: '/company' });
await app.register(syncRoutes, { prefix: '/sync' });
await app.register(analyticsRoutes, { prefix: '/analytics' });
await app.register(alertRoutes, { prefix: '/alerts' });
await app.register(routeRoutes, { prefix: '/routes' });
await app.register(notificationRoutes, { prefix: '/notifications' });
await app.register(aiRoutes, { prefix: '/ai' });
await app.register(predictionRoutes, { prefix: '/predictions' });

// Start server
const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  app.log.info(`Server listening on ${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
