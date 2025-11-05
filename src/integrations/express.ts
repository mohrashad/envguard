import { EnvGuard } from "../core/envguard";
import { Request, Response, NextFunction, Application } from 'express';


export class EnvGuardExpress {
  constructor(private envGuard: EnvGuard) { }

  /**
   * Express middleware to inject env into request
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      req.env = this.envGuard.getAll();
      next();
    };
  }

  /**
   * Health check endpoint
   */
  healthCheck() {
    return (req: Request, res: Response) => {
      try {
        const env = this.envGuard.getAll();
        res.json({
          status: 'ok',
          environment: process.env.NODE_ENV,
          configuredVariables: Object.keys(env).length,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        res.status(500).json({
          status: 'error',
          message: error.message,
        });
      }
    };
  }

  /**
   * Setup Express app with EnvGuard
   */
  setup(app: Application) {
    app.use(this.middleware());
    app.get('/health', this.healthCheck());
    return app;
  }
}

export function setupExpressEnv(app: Application, envGuard: EnvGuard): Application {
  const integration = new EnvGuardExpress(envGuard);
  return integration.setup(app);
}
