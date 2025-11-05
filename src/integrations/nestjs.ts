import { EnvGuard } from '../core/envguard';
import {  EnvGuardOptions } from '../types';
import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware, Module, DynamicModule, Global } from '@nestjs/common';

@Injectable()
export class EnvGuardMiddleware implements NestMiddleware {
  constructor(private readonly envGuard: EnvGuard) {}

  use(req: Request, res: Response, next: NextFunction) {
    req.env = this.envGuard.getAll();
    next();
  }
}

@Injectable()
export class EnvGuardService<T = any> {
  constructor(private readonly envGuard: EnvGuard) {}

  /**
   * Get single environment variable with type safety
   */
  get<K extends keyof T>(key: K): T[K] {
    return this.envGuard.get(key as string) as T[K];
  }

  /**
   * Get all environment variables
   */
  getAll(): T {
    return this.envGuard.getAll() as T;
  }

  /**
   * Update environment variable
   */
  update<K extends keyof T>(key: K, value: T[K]): void {
    this.envGuard.update(key as string, value);
  }

  /**
   * Watch for changes
   */
  onChange(callback: (env: T) => void): void {
    this.envGuard.on('reload', callback);
  }
}

@Global()
@Module({})
export class EnvGuardModule {
  static forRoot(options: EnvGuardOptions): DynamicModule {
    const envGuard = new EnvGuard(options);

    return {
      module: EnvGuardModule,
      providers: [
        {
          provide: EnvGuard,
          useValue: envGuard,
        },
        {
          provide: EnvGuardService,
          useFactory: () => new EnvGuardService(envGuard),
        },
        EnvGuardMiddleware,
      ],
      exports: [EnvGuard, EnvGuardService, EnvGuardMiddleware],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<EnvGuardOptions> | EnvGuardOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: EnvGuardModule,
      providers: [
        {
          provide: EnvGuard,
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return new EnvGuard(config);
          },
          inject: options.inject || [],
        },
        {
          provide: EnvGuardService,
          useFactory: (envGuard: EnvGuard) => new EnvGuardService(envGuard),
          inject: [EnvGuard],
        },
        EnvGuardMiddleware,
      ],
      exports: [EnvGuard, EnvGuardService, EnvGuardMiddleware],
    };
  }
}
