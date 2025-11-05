import { EnvSchema } from '../types';

export class EnvGuardSwagger {
  static generateSwaggerDoc(schema: EnvSchema) {
    const properties: any = {};
    const required: string[] = [];

    for (const [key, config] of Object.entries(schema)) {
      if (config.sensitive) continue; // skip sensitive data like passwords

      properties[key] = {
        type: this.mapType(config.type),
        description: config.description,
        example: config.example,
        default: config.default,
      };

      if (config.enum) {
        properties[key].enum = config.enum;
      }

      if (config.required) {
        required.push(key);
      }
    }

    return {
      components: {
        schemas: {
          Environment: {
            type: 'object',
            properties,
            required,
          },
        },
      },
    };
  }

  private static mapType(envType: string): string {
    switch (envType) {
      case 'number':
      case 'port':
        return 'integer';
      case 'boolean':
        return 'boolean';
      case 'json':
        return 'object';
      default:
        return 'string';
    }
  }
}