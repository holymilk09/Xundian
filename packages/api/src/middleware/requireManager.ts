import type { FastifyRequest, FastifyReply } from 'fastify';

export const MANAGER_ROLES = ['admin', 'area_manager', 'regional_director'];

export function requireManager(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!MANAGER_ROLES.includes(request.employee.role)) {
    reply.code(403).send({ success: false, error: 'Manager access required' });
    return false;
  }
  return true;
}
