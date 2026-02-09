import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    companyId: string | null;
  }
}

async function tenantPluginImpl(app: FastifyInstance) {
  app.decorateRequest('companyId', null);

  app.addHook('onRequest', async (request: FastifyRequest) => {
    if (request.employee) {
      request.companyId = request.employee.company_id;
    }
  });
}

export const tenantPlugin = fp(tenantPluginImpl, {
  name: 'tenant',
  dependencies: ['auth'],
});
