import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import helmet from '@fastify/helmet';
import csrf from '@fastify/csrf-protection';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEnv } from './config/env.js';

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
import { shelfDiffRoutes } from './routes/shelfDiff.js';
import { checklistRoutes } from './routes/checklists.js';
import { goalRoutes } from './routes/goals.js';
import { integrityRoutes } from './routes/integrity.js';
import { reportRoutes } from './routes/reports.js';
import { exportRoutes } from './routes/export.js';
import { promotionRoutes } from './routes/promotions.js';
import { recordAuditEvent, shouldAuditRequest } from './services/audit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = validateEnv();

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register plugins
await app.register(cors, {
  origin: env.CORS_ORIGINS,
  credentials: true,
});

await app.register(jwt, {
  secret: env.JWT_SECRET,
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Security headers
await app.register(helmet, {
  contentSecurityPolicy: false, // CSP needs careful tuning per deployment
});

// CSRF protection for cookie-based auth
await app.register(csrf, {
  cookieOpts: { signed: true },
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

app.get('/health/maps', async () => {
  return {
    status: process.env.GAODE_API_KEY ? 'ready' : 'missing_key',
    provider: 'gaode',
    web_service_key_configured: Boolean(process.env.GAODE_API_KEY),
    js_key_configured: Boolean(process.env.GAODE_JS_KEY),
    security_secret_configured: Boolean(process.env.GAODE_SECURITY_SECRET),
    demo_mode: process.env.DEMO_MODE === 'true' || process.env.ENABLE_DEMO_DATA === 'true',
  };
});

app.addHook('onResponse', async (request, reply) => {
  if (!shouldAuditRequest(request, reply.statusCode)) return;
  try {
    await recordAuditEvent(request, reply.statusCode);
  } catch (err) {
    request.log.error({ err }, 'Failed to record audit event');
  }
});

// Register routes
await app.register(async function authWithRateLimit(authApp) {
  await authApp.register(rateLimit, {
    max: 10,
    timeWindow: '1 minute',
  });
  await authApp.register(authRoutes);
}, { prefix: '/auth' });
await app.register(storeRoutes, { prefix: '/stores' });
await app.register(visitRoutes, { prefix: '/visits' });
await app.register(photoRoutes);
await app.register(companyRoutes, { prefix: '/company' });
await app.register(syncRoutes, { prefix: '/sync' });
await app.register(analyticsRoutes, { prefix: '/analytics' });
await app.register(alertRoutes, { prefix: '/alerts' });
await app.register(routeRoutes, { prefix: '/routes' });
await app.register(notificationRoutes, { prefix: '/notifications' });
await app.register(async function aiWithRateLimit(aiApp) {
  await aiApp.register(rateLimit, {
    max: 30,
    timeWindow: '1 minute',
  });
  await aiApp.register(aiRoutes);
}, { prefix: '/ai' });
await app.register(predictionRoutes, { prefix: '/predictions' });
await app.register(shelfDiffRoutes, { prefix: '/shelf-diffs' });
await app.register(checklistRoutes, { prefix: '/checklists' });
await app.register(goalRoutes, { prefix: '/goals' });
await app.register(integrityRoutes, { prefix: '/integrity' });
await app.register(reportRoutes, { prefix: '/reports' });
await app.register(async function exportWithRateLimit(exportApp) {
  await exportApp.register(rateLimit, {
    max: 10,
    timeWindow: '1 minute',
  });
  await exportApp.register(exportRoutes);
}, { prefix: '/export' });
await app.register(promotionRoutes, { prefix: '/promotions' });

// Start server
try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Server listening on ${env.HOST}:${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
