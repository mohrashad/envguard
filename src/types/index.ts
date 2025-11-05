export type EnvType = 'string' | 'number' | 'boolean' | 'enum' | 'url' | 'email' | 'port' | 'json';

export interface EnvFieldConfig {
  type: EnvType;
  required?: boolean;
  default?: any;
  description?: string;
  example?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  transform?: (value: any) => any;
  validate?: (value: any) => boolean | string;
  sensitive?: boolean; // for sesitve data like passwords
  deprecated?: boolean | string;
  group?: string; // for grouping fields like database credentials
}

export interface EnvSchema {
  [key: string]: EnvFieldConfig;
}

export interface EnvGuardOptions {
  schema: EnvSchema;
  envPath?: string;
  skipOsEnv?: boolean; // skip OS environment variables
  autoCreate?: boolean; // create .env file automatically
  autoPopulate?: boolean; // populate default values automatically
  strict?: boolean; // reject unknown variables
  cache?: boolean; // cache resolved values
  watch?: boolean; // watch for changes
  onError?: (errors: EnvError[]) => void;
  onWarning?: (warnings: string[]) => void;
  encrypt?: boolean; // encrypt sensitive data
  encryptionKey?: string;
}

export interface EnvError {
  field: string;
  message: string;
  type: 'missing' | 'invalid' | 'type_error';
}

export interface ParsedEnv {
  [key: string]: any;
}