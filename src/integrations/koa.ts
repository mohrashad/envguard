import { ParsedEnv } from '../types';
import { EnvGuard } from '../core/envguard';
import { Context, Middleware, Next, DefaultState } from 'koa';

// Extend Koa Context type
declare module 'koa' {
  interface Context {
    env: ParsedEnv;
  }
}

export class EnvGuardKoa {
  constructor(private envGuard: EnvGuard) {}

  /**
   * Koa middleware
   */
  middleware(): Middleware<DefaultState, Context> {
    return async (ctx: Context, next: Next) => {
      ctx.env = this.envGuard.getAll();
      await next();

    };
  }

  /**
   * Health check middleware
   */
  healthCheck(): Middleware<DefaultState, Context> {
    return async (ctx: Context) => {
      try {
        const env = this.envGuard.getAll();
        ctx.body = {
          status: 'ok',
          environment: process.env.NODE_ENV,
          configuredVariables: Object.keys(env).length,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        ctx.status = 500;
        ctx.body = {
          status: 'error',
          message: error.message,
        };
      }
    };
  }
}

// Export helper function
export function setupKoaEnv(envGuard: EnvGuard): EnvGuardKoa {
  return new EnvGuardKoa(envGuard);
}
