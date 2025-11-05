import { EnvFieldConfig } from '../types';

export class TypeValidator {
  validate(key: string, value: any, config: EnvFieldConfig): any {
    switch (config.type) {
      case 'string':
        return this.validateString(value, config);
      case 'number':
        return this.validateNumber(value, config);
      case 'boolean':
        return this.validateBoolean(value);
      case 'enum':
        return this.validateEnum(value, config);
      case 'url':
        return this.validateUrl(value);
      case 'email':
        return this.validateEmail(value);
      case 'port':
        return this.validatePort(value);
      case 'json':
        return this.validateJson(value);
      default:
        return value;
    }
  }

  private validateString(value: any, config: EnvFieldConfig): string {
    const str = String(value);

    if (config.pattern && !config.pattern.test(str)) {
      throw new Error(`Value does not match pattern ${config.pattern}`);
    }

    if (config.min !== undefined && str.length < config.min) {
      throw new Error(`String length must be at least ${config.min}`);
    }

    if (config.max !== undefined && str.length > config.max) {
      throw new Error(`String length must be at most ${config.max}`);
    }

    return str;
  }

  private validateNumber(value: any, config: EnvFieldConfig): number {
    const num = Number(value);

    if (isNaN(num)) {
      throw new Error(`Invalid number: ${value}`);
    }

    if (config.min !== undefined && num < config.min) {
      throw new Error(`Number must be at least ${config.min}`);
    }

    if (config.max !== undefined && num > config.max) {
      throw new Error(`Number must be at most ${config.max}`);
    }

    return num;
  }

  private validateBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;

    const str = String(value).toLowerCase();
    if (str === 'true' || str === '1' || str === 'yes') return true;
    if (str === 'false' || str === '0' || str === 'no') return false;

    throw new Error(`Invalid boolean value: ${value}`);
  }

  private validateEnum(value: any, config: EnvFieldConfig): string {
    const str = String(value);

    if (!config.enum || !config.enum.includes(str)) {
      throw new Error(`Value must be one of: ${config.enum?.join(', ')}`);
    }

    return str;
  }

  private validateUrl(value: any): string {
    const str = String(value);

    try {
      new URL(str);
      return str;
    } catch {
      throw new Error(`Invalid URL: ${value}`);
    }
  }

  private validateEmail(value: any): string {
    const str = String(value);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(str)) {
      throw new Error(`Invalid email: ${value}`);
    }

    return str;
  }

  private validatePort(value: any): number {
    const num = Number(value);

    if (isNaN(num) || num < 1 || num > 65535) {
      throw new Error(`Invalid port number: ${value}`);
    }

    return num;
  }

  private validateJson(value: any): any {
    if (typeof value === 'object') return value;

    try {
      return JSON.parse(String(value));
    } catch {
      throw new Error(`Invalid JSON: ${value}`);
    }
  }
}