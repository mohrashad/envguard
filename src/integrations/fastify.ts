import { ParsedEnv } from '../types';
import { EnvGuard } from '../core/envguard';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Extend Fastify Request type
declare module 'fastify' {
  interface FastifyRequest {
    env: ParsedEnv;
  }
}

export class EnvGuardFastify {
  constructor(private envGuard: EnvGuard) {}

  /**
   * Fastify plugin
   */
  async plugin(fastify: FastifyInstance) {
    // Add env to request
    fastify.decorateRequest('env', this.envGuard.getAll());
    
    fastify.addHook('onRequest', async (request: FastifyRequest) => {
      request.env = this.envGuard.getAll();
    });

    // Health check route
    fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const env = this.envGuard.getAll();
        return {
          status: 'ok',
          environment: process.env.NODE_ENV,
          configuredVariables: Object.keys(env).length,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        reply.status(500);
        return {
          status: 'error',
          message: error.message,
        };
      }
    });
  }
}

// Export helper function
export async function setupFastifyEnv(
  fastify: FastifyInstance,
  envGuard: EnvGuard
): Promise<void> {
  const integration = new EnvGuardFastify(envGuard);
  await fastify.register(async (instance) => {
    await integration.plugin(instance);
  });
}
