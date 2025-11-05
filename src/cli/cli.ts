#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { EnvSchema } from '../types';
import { createEnvGuard } from '../core/envguard';

interface CLIOptions {
  file?: string;
  output?: string;
  format?: 'json' | 'yaml' | 'env';
  key?: string;
  value?: string;
  quiet?: boolean;
  verbose?: boolean;
}

export class EnvGuardCLI {
  private args: string[];
  private options: CLIOptions = {};
  private cwd: string;

  constructor(args: string[] = process.argv.slice(2)) {
    this.args = args;
    this.cwd = process.cwd();
    this.parseOptions();
  }

  private parseOptions(): void {
    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];

      switch (arg) {
        case '--file':
        case '-f':
          this.options.file = this.args[++i];
          break;
        case '--output':
        case '-o':
          this.options.output = this.args[++i];
          break;
        case '--format':
          this.options.format = this.args[++i] as any;
          break;
        case '--key':
        case '-k':
          this.options.key = this.args[++i];
          break;
        case '--value':
        case '-v':
          this.options.value = this.args[++i];
          break;
        case '--quiet':
        case '-q':
          this.options.quiet = true;
          break;
        case '--verbose':
          this.options.verbose = true;
          break;
      }
    }
  }

  private log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
    if (this.options.quiet && level !== 'error') return;

    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m',    // Yellow
    };

    const icons = {
      info: 'ℹ',
      success: '✓',
      error: '✗',
      warn: '⚠',
    };

    const reset = '\x1b[0m';
    console.log(`${colors[level]}${icons[level]} ${message}${reset}`);
  }

  private async loadSchema(): Promise<any> {
    // List of possible config/schema files (priority order)
    const possibleFiles = [
      'envguard.config.ts',
      'envguard.config.js',
      'envguard.schema.ts',
      'envguard.schema.js',
    ];

    // Auto-detect the first existing config file
    const configPath = possibleFiles
      .map(f => path.resolve(this.cwd, f))  // Use this.cwd instead of process.cwd()
      .find(f => fs.existsSync(f));

    if (!configPath) {
      throw new Error(`No EnvGuard config/schema file found in ${this.cwd}`);
    }

    const ext = path.extname(configPath);

    try {
      // Load schema using the shared, robust helper
      const schema = await this.loadConfigSchema(configPath, ext);

      // Validate schema structure
      if (!schema || typeof schema !== 'object') {
        throw new Error(`Invalid schema export in ${configPath}`);
      }

      // Extract the actual schema object (handles different export patterns)
      const actualSchema = schema.schema || schema;

      if (!actualSchema || typeof actualSchema !== 'object') {
        throw new Error(`No valid schema found in ${configPath}`);
      }

      return actualSchema;
    } catch (error: any) {
      console.error(`Failed to load schema from ${configPath}:`);
      console.error(error.message);
      throw error;
    }
  }

  async run(): Promise<void> {
    const command = this.args[0];

    try {
      switch (command) {
        case 'init':
          await this.init();
          break;
        case 'validate':
          await this.validate();
          break;
        case 'generate':
        case 'gen':
          await this.generate();
          break;
        case 'encrypt':
          await this.encrypt();
          break;
        case 'decrypt':
          await this.decrypt();
          break;
        case 'check-deprecated':
          await this.checkDeprecated();
          break;
        case 'export':
          await this.exportConfig();
          break;
        case 'diff':
          await this.diff();
          break;
        case 'docs':
          await this.generateDocs();
          break;
        case 'info':
          await this.info();
          break;
        case 'sync':
          await this.sync();
          break;
        case 'doctor':
          await this.doctor();
          break;
        case 'help':
        case '--help':
        case '-h':
          this.showHelp();
          break;
        case 'version':
        case '--version':
        case '-V':
          this.showVersion();
          break;
        default:
          this.log(`Unknown command: ${command}`, 'error');
          this.showHelp();
          process.exit(1);
      }
    } catch (error: any) {
      this.log(`Error: ${error.message}`, 'error');
      if (this.options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  private async init(): Promise<void> {
    this.log('Initializing EnvGuard...', 'info');

    // Check if already initialized
    const configPath = path.join(this.cwd, 'envguard.config.ts');
    if (fs.existsSync(configPath)) {
      this.log('envguard.config.ts already exists', 'warn');
      this.log('Remove it first if you want to reinitialize', 'info');
      return;
    }

    // Ask for template type
    const template = this.args[1] || 'basic';
    const templates = ['basic', 'advanced', 'express', 'microservices', 'ecommerce', 'minimal'];

    if (!templates.includes(template)) {
      this.log(`Unknown template: ${template}`, 'error');
      this.log(`Available templates: ${templates.join(', ')}`, 'info');
      return;
    }

    this.log(`Using ${template} template...`, 'info');

    // Generate config based on template
    const configContent = this.getTemplateContent(template);
    fs.writeFileSync(configPath, configContent);
    this.log('Created envguard.config.ts', 'success');

    // Load schema from the new config
    const config = require(configPath);
    const schema = config.schema || config.default?.schema;

    // Create .env.example
    const examplePath = path.join(this.cwd, '.env.example');
    if (!fs.existsSync(examplePath)) {
      const template = this.generateTemplate(schema);
      fs.writeFileSync(examplePath, template);
      this.log('Created .env.example', 'success');
    }

    // Create .gitignore entry
    const gitignorePath = path.join(this.cwd, '.gitignore');
    const gitignoreContent = '\n# Environment variables\n.env\n.env.local\n.env.*.local\n!.env.example\n';

    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      if (!content.includes('.env')) {
        fs.appendFileSync(gitignorePath, gitignoreContent);
        this.log('Updated .gitignore', 'success');
      }
    } else {
      fs.writeFileSync(gitignorePath, gitignoreContent);
      this.log('Created .gitignore', 'success');
    }

    // Create types directory
    const typesDir = path.join(this.cwd, 'types');
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }

    this.log('\n✨ EnvGuard initialized successfully!', 'success');
    this.log('\nNext steps:', 'info');
    console.log('  1. Copy .env.example to .env:');
    console.log('     cp .env.example .env');
    console.log('  2. Edit .env and fill in your values');
    console.log('  3. Validate your configuration:');
    console.log('     envguard validate');
    console.log('  4. Generate TypeScript types:');
    console.log('     envguard generate');
    console.log('\n📚 Documentation: https://github.com/envguard/envguard');
  }

  private getTemplateContent(template: string): string {
    const templates: Record<string, string> = {
      basic: `import { createEnvGuard, EnvSchema } from 'envguard';

// Define your environment variable schema
export const schema: EnvSchema = {
  PORT: {
    type: 'port',
    default: 3000,
    description: 'Server port',
    group: 'server',
  },
  NODE_ENV: {
    type: 'enum',
    enum: ['development', 'production', 'test'],
    required: true,
    description: 'Application environment',
    group: 'server',
  },
  DATABASE_URL: {
    type: 'url',
    required: true,
    sensitive: true,
    description: 'Database connection URL',
    example: 'postgresql://user:pass@localhost:5432/mydb',
    group: 'database',
  },
  DB_POOL_SIZE: {
    type: 'number',
    default: 10,
    min: 1,
    max: 100,
    description: 'Database connection pool size',
    group: 'database',
  },
};

// Create and export EnvGuard instance
export const envGuard = createEnvGuard({
  schema,
  autoCreate: true,
  autoPopulate: true,
  strict: true,
  cache: true,
});

// Export typed environment
export const env = envGuard.getAll();
`,

      advanced: `import { createEnvGuard, EnvSchema, CommonSchemas } from 'envguard';

export const schema: EnvSchema = {
  // Use pre-built schemas
  ...CommonSchemas.server,
  ...CommonSchemas.database,
  ...CommonSchemas.redis,
  ...CommonSchemas.jwt,
  
  // Custom application variables
  APP_NAME: {
    type: 'string',
    default: 'My App',
    description: 'Application name',
    group: 'app',
  },
  APP_VERSION: {
    type: 'string',
    required: true,
    validate: (value) => /^\\d+\\.\\d+\\.\\d+$/.test(value) || 'Invalid version format',
    description: 'Application version (semantic versioning)',
    example: '1.0.0',
    group: 'app',
  },
  
  // Feature Flags
  FEATURE_NEW_UI: {
    type: 'boolean',
    default: false,
    description: 'Enable new UI',
    group: 'features',
  },
};

export const envGuard = createEnvGuard({
  schema,
  autoCreate: true,
  strict: true,
  cache: true,
  watch: process.env.NODE_ENV === 'development',
  encrypt: process.env.NODE_ENV === 'production',
  encryptionKey: process.env.MASTER_KEY,
  
  onError: (errors) => {
    console.error('❌ Environment validation failed:');
    errors.forEach(err => console.error(\`  - \${err.field}: \${err.message}\`));
    process.exit(1);
  },
});

export const env = envGuard.getAll();
`,

      express: `import { createEnvGuard, EnvSchema, EnvGuardExpress } from 'envguard';

export const schema: EnvSchema = {
  PORT: {
    type: 'port',
    default: 3000,
    description: 'Server port',
  },
  NODE_ENV: {
    type: 'enum',
    enum: ['development', 'production', 'test'],
    required: true,
  },
  DATABASE_URL: {
    type: 'url',
    required: true,
    sensitive: true,
  },
  CORS_ORIGINS: {
    type: 'json',
    default: ['http://localhost:3000'],
    description: 'Allowed CORS origins',
  },
  JWT_SECRET: {
    type: 'string',
    required: true,
    sensitive: true,
    pattern: /^[A-Za-z0-9_-]{32,}$/,
    description: 'JWT signing secret',
  },
};

export const envGuard = createEnvGuard({
  schema,
  autoCreate: true,
  watch: process.env.NODE_ENV === 'development',
});

// Express middleware
export const envMiddleware = new EnvGuardExpress(envGuard);

export const env = envGuard.getAll();
`,

      minimal: `import { createEnvGuard } from 'envguard';

export const envGuard = createEnvGuard({
  schema: {
    PORT: { type: 'port', default: 3000 },
    NODE_ENV: { type: 'enum', enum: ['dev', 'prod'], required: true },
    DATABASE_URL: { type: 'url', required: true, sensitive: true },
  },
});

export const env = envGuard.getAll();
`,

      microservices: `import { createEnvGuard, EnvSchema } from 'envguard';

export const schema: EnvSchema = {
  SERVICE_NAME: {
    type: 'string',
    required: true,
    description: 'Service name',
    group: 'service',
  },
  SERVICE_PORT: {
    type: 'port',
    default: 3000,
    group: 'service',
  },
  
  // Service Discovery
  CONSUL_HOST: {
    type: 'string',
    default: 'localhost',
    group: 'discovery',
  },
  
  // Message Queue
  RABBITMQ_URL: {
    type: 'url',
    required: true,
    sensitive: true,
    group: 'messaging',
  },
  
  // Tracing
  JAEGER_AGENT_HOST: {
    type: 'string',
    default: 'localhost',
    group: 'tracing',
  },
  TRACING_ENABLED: {
    type: 'boolean',
    default: true,
    group: 'tracing',
  },
};

export const envGuard = createEnvGuard({
  schema,
  autoCreate: true,
  strict: true,
});

export const env = envGuard.getAll();
`,

      ecommerce: `import { createEnvGuard, EnvSchema } from 'envguard';

export const schema: EnvSchema = {
  PORT: { type: 'port', default: 3000, group: 'server' },
  NODE_ENV: {
    type: 'enum',
    enum: ['development', 'staging', 'production'],
    required: true,
    group: 'server',
  },
  
  // Database
  DATABASE_URL: {
    type: 'url',
    required: true,
    sensitive: true,
    group: 'database',
  },
  
  // Redis
  REDIS_URL: {
    type: 'url',
    default: 'redis://localhost:6379',
    group: 'cache',
  },
  
  // Stripe
  STRIPE_SECRET_KEY: {
    type: 'string',
    required: true,
    sensitive: true,
    pattern: /^sk_(test|live)_[A-Za-z0-9]{99}$/,
    group: 'payment',
  },
  
  // AWS S3
  AWS_REGION: { type: 'string', default: 'us-east-1', group: 'aws' },
  AWS_ACCESS_KEY_ID: { type: 'string', required: true, sensitive: true, group: 'aws' },
  AWS_SECRET_ACCESS_KEY: { type: 'string', required: true, sensitive: true, group: 'aws' },
  S3_BUCKET_PRODUCTS: { type: 'string', required: true, group: 'aws' },
  
  // Auth
  JWT_SECRET: {
    type: 'string',
    required: true,
    sensitive: true,
    pattern: /^[A-Za-z0-9_-]{32,}$/,
    group: 'auth',
  },
};

export const envGuard = createEnvGuard({
  schema,
  autoCreate: true,
  strict: true,
  encrypt: process.env.NODE_ENV === 'production',
  encryptionKey: process.env.MASTER_KEY,
});

export const env = envGuard.getAll();
`,
    };

    return templates[template] || templates.basic;
  }

  private generateTemplate(schema: EnvSchema): string {
    let content = '# Environment Variables\n';
    content += `# Generated by EnvGuard\n\n`;

    const groups = this.groupSchema(schema);

    for (const [groupName, fields] of Object.entries(groups)) {
      content += `# ========== ${groupName.toUpperCase()} ==========\n`;

      for (const [key, config] of Object.entries(fields)) {
        if (config.description) {
          content += `# ${config.description}\n`;
        }
        if (config.example) {
          content += `# Example: ${key}=${config.example}\n`;
        }

        const value = config.default !== undefined ? config.default : '';
        content += `${key}=${value}\n\n`;
      }
    }

    return content;
  }

  private groupSchema(schema: EnvSchema): Record<string, EnvSchema> {
    const groups: Record<string, EnvSchema> = { 'General': {} };

    for (const [key, config] of Object.entries(schema)) {
      const group = config.group || 'General';
      if (!groups[group]) {
        groups[group] = {};
      }
      groups[group][key] = config;
    }

    return groups;
  }

  private async validate(): Promise<void> {
    this.log('Validating environment configuration...', 'info');

    // List of possible config/schema files
    const possibleFiles = [
      'envguard.config.ts',
      'envguard.config.js',
      'envguard.schema.ts',
      'envguard.schema.js',
    ];

    // Find the first existing config file
    const configPath = possibleFiles
      .map(f => path.resolve(this.cwd, f))
      .find(f => fs.existsSync(f));

    if (!configPath) {
      this.log('Error: No EnvGuard config/schema found', 'error');
      process.exit(1);
    }

    let schema: any;

    try {
      // Load the schema with full TypeScript/ESM/CJS support
      schema = await this.loadConfigSchema(configPath, path.extname(configPath));
    } catch (error: any) {
      this.log('Error: Failed to load schema', 'error');
      if (this.options.verbose) {
        console.error(error.stack);
      } else {
        console.error(error.message);
      }
      process.exit(1);
    }

    // Validate that the exported schema is a valid object
    if (!schema || typeof schema !== 'object') {
      this.log('Error: Invalid schema export. Must export an object.', 'error');
      process.exit(1);
    }

    // Load the .env file (or custom file via --file)
    const envFile = this.options.file || '.env';
    const envPath = path.join(this.cwd, envFile);

    if (!fs.existsSync(envPath)) {
      this.log(`Error: File not found: ${envFile}`, 'error');
      process.exit(1);
    }

    try {
      // Create EnvGuard instance with strict validation
      const envGuard = createEnvGuard({
        schema,
        envPath,
        autoCreate: false,
        strict: true,
      });

      // Trigger validation by accessing all env vars
      const env = envGuard.getAll();

      this.log('Success: Validation passed!', 'success');
      this.log(`Found ${Object.keys(env).length} variables`, 'info');

      // Show detailed variable info in verbose mode
      if (this.options.verbose) {
        console.log('\nVariables:');
        Object.entries(schema).forEach(([key, config]: [string, any]) => {
          const sensitive = config.sensitive ? 'Locked' : '';
          const required = config.required ? ' (required)' : '';
          console.log(`  ${sensitive} ${key}: ${config.type || 'string'}${required}`);
        });
      }
      process.exit(1);
    } catch (error: any) {
      this.log('Error: Validation failed!', 'error');
      console.error(error.message);
      process.exit(1);
    }
  }

  private async generate(): Promise<void> {
    this.log('Generating TypeScript types...', 'info');

    const schema = this.loadSchema();
    const output = this.options.output || path.join(this.cwd, 'types', 'env.d.ts');

    let types = '// Auto-generated by EnvGuard\n';
    types += '// Do not edit this file manually\n\n';
    types += 'export interface Env {\n';

    for (const [key, config] of Object.entries(schema)) {
      if (config.description) {
        types += `  /** ${config.description} */\n`;
      }

      let tsType = 'string';
      switch (config.type) {
        case 'number':
        case 'port':
          tsType = 'number';
          break;
        case 'boolean':
          tsType = 'boolean';
          break;
        case 'enum':
          tsType = config.enum ? config.enum.map((v: string) => `'${v}'`).join(' | ') : 'string';
          break;
        case 'json':
          tsType = 'any';
          break;
      }

      const optional = !config.required ? '?' : '';
      types += `  ${key}${optional}: ${tsType};\n`;
    }

    types += '}\n\n';
    types += 'declare global {\n';
    types += '  namespace NodeJS {\n';
    types += '    interface ProcessEnv extends Env {}\n';
    types += '  }\n';
    types += '}\n\n';
    types += 'export {};\n';

    // Create directory if it doesn't exist
    const dir = path.dirname(output);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(output, types);
    this.log(`Types generated at ${output}`, 'success');
  }

  private async encrypt(): Promise<void> {
    const key = this.options.key;
    const value = this.options.value;

    if (!key || !value) {
      this.log('Both --key and --value are required', 'error');
      process.exit(1);
    }

    const { EncryptionManager } = await import('../utils/encryption');

    const encryptionKey = process.env.MASTER_KEY || process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      this.log('MASTER_KEY or ENCRYPTION_KEY environment variable is required', 'error');
      process.exit(1);
    }

    const manager = new EncryptionManager(encryptionKey);
    const encrypted = manager.encrypt(value);

    this.log(`Encrypted value for ${key}:`, 'success');
    console.log(encrypted);
    console.log(`\nAdd to .env:\n${key}=${encrypted}`);
  }

  private async decrypt(): Promise<void> {
    const key = this.options.key;
    const value = this.options.value;

    if (!key || !value) {
      this.log('Both --key and --value are required', 'error');
      process.exit(1);
    }

    const { EncryptionManager } = await import('../utils/encryption');

    const encryptionKey = process.env.MASTER_KEY || process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      this.log('MASTER_KEY or ENCRYPTION_KEY environment variable is required', 'error');
      process.exit(1);
    }

    try {
      const manager = new EncryptionManager(encryptionKey);
      const decrypted = manager.decrypt(value);

      this.log(`Decrypted value for ${key}:`, 'success');
      console.log(decrypted);
    } catch (error) {
      this.log('Decryption failed. Check your encryption key.', 'error');
      process.exit(1);
    }
  }

  private async checkDeprecated(): Promise<void> {
    this.log('Checking for deprecated variables...', 'info');

    const schema = this.loadSchema();
    const deprecated = Object.entries(schema).filter(
      ([, config]) => config.deprecated
    );

    if (deprecated.length === 0) {
      this.log('No deprecated variables found', 'success');
      return;
    }

    this.log(`Found ${deprecated.length} deprecated variable(s):`, 'warn');

    deprecated.forEach(([key, config]) => {
      const msg = typeof config.deprecated === 'string'
        ? config.deprecated
        : 'This variable is deprecated';
      console.log(`  ⚠ ${key}: ${msg}`);
    });
  }

  private async exportConfig(): Promise<void> {
    this.log('Exporting configuration...', 'info');

    const schema = await this.loadSchema();
    const format = this.options.format || 'json';
    const output = this.options.output || `config.${format}`;

    const envGuard = createEnvGuard({
      schema,
      autoCreate: false,
    });

    const env = envGuard.getAll();

    let content: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(env, null, 2);
        break;

      case 'yaml':
        content = this.toYAML(env);
        break;

      case 'env':
        content = Object.entries(env)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        break;

      default:
        this.log(`Unknown format: ${format}`, 'error');
        process.exit(1);
    }

    fs.writeFileSync(output, content);
    this.log(`Configuration exported to ${output}`, 'success');
  }

  private toYAML(obj: any, indent = 0): string {
    let yaml = '';
    const spaces = '  '.repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n${this.toYAML(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          yaml += `${spaces}  - ${item}\n`;
        });
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }

  private async diff(): Promise<void> {
    this.log('Comparing environment files...', 'info');

    const file1 = this.options.file || '.env';
    const file2 = this.args[1] || '.env.example';

    const env1 = this.parseEnvFile(path.join(this.cwd, file1));
    const env2 = this.parseEnvFile(path.join(this.cwd, file2));

    const keys1 = new Set(Object.keys(env1));
    const keys2 = new Set(Object.keys(env2));

    const onlyIn1 = Array.from(keys1).filter(k => !keys2.has(k));
    const onlyIn2 = Array.from(keys2).filter(k => !keys1.has(k));
    const common = Array.from(keys1).filter(k => keys2.has(k));

    if (onlyIn1.length > 0) {
      console.log(`\n✓ Only in ${file1}:`);
      onlyIn1.forEach(key => console.log(`  + ${key}=${env1[key]}`));
    }

    if (onlyIn2.length > 0) {
      console.log(`\n✗ Only in ${file2}:`);
      onlyIn2.forEach(key => console.log(`  - ${key}=${env2[key]}`));
    }

    const different = common.filter(key => env1[key] !== env2[key]);
    if (different.length > 0) {
      console.log(`\n≠ Different values:`);
      different.forEach(key => {
        console.log(`  ~ ${key}`);
        console.log(`    ${file1}: ${env1[key]}`);
        console.log(`    ${file2}: ${env2[key]}`);
      });
    }

    if (onlyIn1.length === 0 && onlyIn2.length === 0 && different.length === 0) {
      this.log('Files are identical', 'success');
    }
  }

  private parseEnvFile(filePath: string): Record<string, string> {
    if (!fs.existsSync(filePath)) {
      this.log(`File not found: ${filePath}`, 'error');
      process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const env: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
      if (match) {
        const [, key, value] = match;
        env[key] = value.replace(/^["']|["']$/g, '');
      }
    }

    return env;
  }

  private async generateDocs(): Promise<void> {
    this.log('Generating documentation...', 'info');

    const schema = await this.loadSchema();
    const output = this.options.output || 'ENV_DOCS.md';

    let docs = '# Environment Variables Documentation\n\n';
    docs += `Generated on ${new Date().toISOString()}\n\n`;

    const groups = this.groupSchema(schema);

    for (const [groupName, fields] of Object.entries(groups)) {
      docs += `## ${groupName}\n\n`;
      docs += '| Variable | Type | Required | Default | Description |\n';
      docs += '|----------|------|----------|---------|-------------|\n';

      for (const [key, config] of Object.entries(fields)) {
        const type = config.type || 'string';
        const required = config.required ? '✓' : '';
        const defaultValue = config.default !== undefined ? `\`${config.default}\`` : '-';
        const description = config.description || '-';

        docs += `| \`${key}\` | ${type} | ${required} | ${defaultValue} | ${description} |\n`;
      }

      docs += '\n';
    }

    fs.writeFileSync(output, docs);
    this.log(`Documentation generated at ${output}`, 'success');
  }

  private async loadConfigSchema(configPath: string, ext: string): Promise<any> {
    let isESM = false;

    // Detect if the project is ESM by checking package.json
    const pkgPath = path.join(this.cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        isESM = pkg.type === 'module';
      } catch {
        // If package.json is invalid, default to CJS
      }
    }

    // Register TypeScript loader if file is .ts
    if (ext === '.ts') {
      let registered = false;

      // Try esbuild-register first (faster, no type checking)
      try {
        const esbuildPath = require.resolve('esbuild-register/dist/node', {
          paths: [process.cwd()],
        });
        if (fs.existsSync(esbuildPath)) {
          const { register } = await import(esbuildPath);
          register({
            target: 'esnext',
            format: isESM ? 'esm' : 'cjs',
          });
          registered = true;
        }
      } catch {
        // Ignore and try ts-node
      }

      // Fallback to ts-node
      if (!registered) {
        try {
          require('ts-node/register');
          this.log('TypeScript support enabled via ts-node', 'info');
        } catch {
          this.log(
            'Warning: TypeScript config detected but no loader found (install esbuild-register or ts-node)',
            'warn'
          );
        }
      }
    }

    // Load the module
    let configModule: any;

    if (isESM) {
      // ESM: use dynamic import with file URL
      configModule = await import(pathToFileURL(configPath).href);
    } else {
      // CommonJS: use require
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      configModule = require(configPath);
    }

    // Extract schema from common export patterns
    return (
      configModule.default ||
      configModule.schema ||
      configModule.env ||
      configModule.envGuard?.schema ||
      configModule
    );
  }

  private async info(): Promise<void> {
    const schema: EnvSchema = await this.loadSchema();
    const total = Object.keys(schema).length;
    const required = Object.values(schema).filter((c) => c.required).length;
    const sensitive = Object.values(schema).filter(c => c.sensitive).length;
    const deprecated = Object.values(schema).filter(c => c.deprecated).length;

    console.log('\n📊 Environment Configuration Summary\n');
    console.log(`Total variables:      ${total}`);
    console.log(`Required:             ${required}`);
    console.log(`Sensitive:            ${sensitive} 🔒`);
    console.log(`Deprecated:           ${deprecated} ⚠`);

    const types = Object.values(schema).reduce((acc: Record<string, number>, config: any) => {
      const type = config.type || 'string';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nBy Type:');
    Object.entries(types).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    const groups = this.groupSchema(schema);
    console.log('\nBy Group:');
    Object.entries(groups).forEach(([group, fields]) => {
      console.log(`  ${group}: ${Object.keys(fields).length}`);
    });
  }

  private async sync(): Promise<void> {
    this.log('Syncing environment files...', 'info');

    const schema = await this.loadSchema();
    const envPath = path.join(this.cwd, '.env');
    const examplePath = path.join(this.cwd, '.env.example');

    if (!fs.existsSync(envPath)) {
      this.log('.env file not found', 'error');
      process.exit(1);
    }

    const currentEnv = this.parseEnvFile(envPath);
    const template = this.generateTemplate(schema);

    fs.writeFileSync(examplePath, template);
    this.log('.env.example updated', 'success');

    // Check for missing variables
    const schemaKeys = Object.keys(schema);
    const envKeys = Object.keys(currentEnv);
    const missing = schemaKeys.filter(k => !envKeys.includes(k));

    if (missing.length > 0) {
      this.log(`Found ${missing.length} missing variable(s):`, 'warn');
      missing.forEach(key => console.log(`  - ${key}`));
    }
  }

  private async doctor(): Promise<void> {
    this.log('Running environment health check...', 'info');

    let issues = 0;

    // Check schema
    console.log('\n1. Checking schema...');
    try {
      this.loadSchema();
      this.log('  ✓ Schema found and valid', 'success');
    } catch (error) {
      this.log('  ✗ Schema not found or invalid', 'error');
      issues++;
    }

    // Check .env
    console.log('\n2. Checking .env file...');
    const envPath = path.join(this.cwd, '.env');
    if (fs.existsSync(envPath)) {
      this.log('  ✓ .env file exists', 'success');

      try {
        const schema = await this.loadSchema();
        const envGuard = createEnvGuard({
          schema,
          envPath,
          autoCreate: false,
        });
        envGuard.getAll();
        this.log('  ✓ Environment variables valid', 'success');
      } catch (error: any) {
        this.log(`  ✗ Validation failed: ${error.message}`, 'error');
        issues++;
      }
    } else {
      this.log('  ✗ .env file not found', 'error');
      issues++;
    }

    // Check .env.example
    console.log('\n3. Checking .env.example...');
    const examplePath = path.join(this.cwd, '.env.example');
    if (fs.existsSync(examplePath)) {
      this.log('  ✓ .env.example exists', 'success');
    } else {
      this.log('  ⚠ .env.example not found', 'warn');
    }

    // Check types
    console.log('\n4. Checking TypeScript types...');
    const typesPath = path.join(this.cwd, 'types', 'env.d.ts');
    if (fs.existsSync(typesPath)) {
      this.log('  ✓ Type definitions exist', 'success');
    } else {
      this.log('  ⚠ Type definitions not found. Run "envguard generate"', 'warn');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    if (issues === 0) {
      this.log('✓ All checks passed!', 'success');
      process.exit(1);
    } else {
      this.log(`✗ Found ${issues} issue(s)`, 'error');
      process.exit(1);
    }
  }

  private showHelp(): void {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                        EnvGuard CLI                          ║
║     Type-safe environment variable management for Node.js    ║
╚══════════════════════════════════════════════════════════════╝

USAGE:
  envguard <command> [options]

COMMANDS:
  init [template]         Initialize EnvGuard in your project
                         Templates: basic, advanced, express, minimal,
                                   microservices, ecommerce
  validate               Validate environment configuration
  generate, gen          Generate TypeScript type definitions
  encrypt                Encrypt a sensitive value
  decrypt                Decrypt an encrypted value
  check-deprecated       Check for deprecated variables
  export                 Export configuration to different formats
  diff [file1] [file2]   Compare two environment files
  docs                   Generate documentation
  info                   Show environment statistics
  sync                   Sync .env.example with schema
  doctor                 Run health checks
  help                   Show this help message
  version                Show version number

OPTIONS:
  --file, -f <file>      Specify .env file path (default: .env)
  --output, -o <path>    Specify output path
  --format <format>      Export format (json|yaml|env)
  --key, -k <key>        Environment variable key
  --value, -v <value>    Environment variable value
  --quiet, -q            Suppress output
  --verbose              Show detailed output

EXAMPLES:
  # Initialize with basic template
  envguard init
  
  # Initialize with specific template
  envguard init express
  envguard init microservices

  # Validate configuration
  envguard validate

  # Generate TypeScript types
  envguard generate --output ./types/env.d.ts

  # Encrypt a secret
  MASTER_KEY=your-key envguard encrypt --key JWT_SECRET --value "my-secret"

  # Compare environments
  envguard diff .env .env.production

  # Export to JSON
  envguard export --format json --output config.json

  # Check project health
  envguard doctor

CONFIGURATION FILES:
  EnvGuard looks for configuration in the following order:
  1. envguard.config.ts
  2. envguard.config.js
  3. config/env.ts
  4. src/config/env.ts

DOCUMENTATION:
  https://github.com/envguard/envguard

SUPPORT:
  https://github.com/envguard/envguard/issues
    `);
  }

  private showVersion(): void {
    const packagePath = path.resolve(__dirname, '../../../package.json');
    const packageJson = require(packagePath);

    console.log(`EnvGuard v${packageJson.version}`);
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new EnvGuardCLI();
  cli.run().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}