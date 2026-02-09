import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type { EmployeeRole } from '@xundian/shared';

declare module 'fastify' {
  interface FastifyRequest {
    employee: {
      id: string;
      company_id: string;
      role: EmployeeRole;
    };
  }
}

const SKIP_AUTH_PREFIXES = ['/auth/', '/health'];

function shouldSkipAuth(url: string): boolean {
  return SKIP_AUTH_PREFIXES.some((prefix) => url.startsWith(prefix));
}

async function authPluginImpl(app: FastifyInstance) {
  app.decorateRequest('employee', null);

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (shouldSkipAuth(request.url)) {
      return;
    }

    try {
      const decoded = await request.jwtVerify<{
        sub: string;
        company_id: string;
        role: EmployeeRole;
      }>();

      request.employee = {
        id: decoded.sub,
        company_id: decoded.company_id,
        role: decoded.role,
      };
    } catch {
      reply.code(401).send({ success: false, error: 'Unauthorized' });
    }
  });
}

export const authPlugin = fp(authPluginImpl, {
  name: 'auth',
});
