import type { FastifyRequest } from 'fastify';
import pool from '../db/pool.js';

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function firstParam(params: unknown, keys: string[]): string | null {
  if (!params || typeof params !== 'object') return null;
  const record = params as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

function entityTypeFromUrl(url: string): string | null {
  const clean = url.split('?')[0] || url;
  const [first] = clean.split('/').filter(Boolean);
  return first || null;
}

export function shouldAuditRequest(request: FastifyRequest, statusCode: number): boolean {
  if (statusCode >= 400) return false;
  if (AUDITED_METHODS.has(request.method)) return true;
  return request.method === 'GET' && request.url.startsWith('/export/');
}

export async function recordAuditEvent(request: FastifyRequest, statusCode: number): Promise<void> {
  const entityType = entityTypeFromUrl(request.url);
  const entityId = firstParam(request.params, ['id', 'storeId', 'visitId', 'photoId']);
  const route = request.routeOptions.url || request.url.split('?')[0] || request.url;

  await pool.query(
    `INSERT INTO audit_events (
       company_id, employee_id, action, entity_type, entity_id, route, method,
       status_code, ip, user_agent
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      request.companyId || null,
      request.employee?.id || null,
      `${request.method} ${route}`,
      entityType,
      entityId,
      route,
      request.method,
      statusCode,
      request.ip,
      request.headers['user-agent'] || null,
    ],
  );
}
