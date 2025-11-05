import 'reflect-metadata';

const ENV_SCHEMA_KEY = Symbol('envSchema');

export function EnvField(config: any) {
  return function (target: any, propertyKey: string) {
    const schema = Reflect.getMetadata(ENV_SCHEMA_KEY, target.constructor) || {};
    schema[propertyKey] = config;
    Reflect.defineMetadata(ENV_SCHEMA_KEY, schema, target.constructor);
  };
}

export function EnvClass() {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    const schema = Reflect.getMetadata(ENV_SCHEMA_KEY, constructor) || {};

    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        Object.assign(this, schema);
      }
    };
  };
}