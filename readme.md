# 🛡️ EnvGuard

**Type-safe, validated, and encrypted environment variables for Node.js**

[![npm version](https://badge.fury.io/js/envguard.svg)](https://www.npmjs.com/package/envguard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

Stop worrying about missing environment variables, type errors, and security issues. EnvGuard provides a complete, zero-dependency solution for managing environment configuration in Node.js applications with full TypeScript support.

---

## ✨ Features

### 🎯 Core Features
| Feature | Description |
| :--- | :--- |
| **Type Safety** | Full TypeScript support with auto-generated types for `process.env`. |
| **Schema Validation** | Define strict schemas with built-in and custom validators. |
| **Auto-Generation** | Automatically creates `.env` files with comments, examples, and default values. |
| **Hot Reload** | Watch for changes in the `.env` file and reload configuration in real-time. |
| **Encryption** | Built-in AES-256-GCM encryption for sensitive values (JWT secrets, API keys, etc.). |
| **Grouped Configuration** | Organize variables into logical groups for better readability in the generated `.env` file. |
| **Strict Mode** | Reject unknown environment variables not defined in the schema. |
| **Deprecation Warnings** | Mark old variables as deprecated with custom migration hints. |
| **Zero Dependencies** | Core functionality has no external dependencies. |

### 🚀 Advanced Features
| Feature | Description |
| :--- | :--- |
| **Custom Transforms** | Transform values during parsing (e.g., convert MB to bytes, parse custom strings). |
| **Custom Validation** | Use a custom function or RegExp pattern for fine-grained validation logic. |
| **Runtime Update** | Programmatically update environment variables and the `.env` file at runtime using `envGuard.update()`. |
| **Events** | Listen for `'reload'` and `'update'` events to react to configuration changes. |
| **Decorator Support** | Define your schema using TypeScript decorators (`@EnvField`, `@EnvClass`). |
| **Skip OS Env** | Option to ignore existing `process.env` variables and only use those from the schema/`.env` file. |
| **Error/Warning Handlers** | Custom `onError` and `onWarning` callbacks for handling validation failures and deprecation notices. |

---

## 📦 Installation

```bash
npm install envguard
# or
yarn add envguard
# or
pnpm add envguard
```

---

## 🚀 Quick Start

### 1. Basic Schema Definition

Define your environment schema and create the `EnvGuard` instance.

```typescript
// envguard.config.ts or index.ts
import { createEnvGuard } from 'envguard';

const envGuard = createEnvGuard({
  schema: {
    PORT: {
      type: 'port',
      default: 3000,
      description: 'Server port',
    },
    DATABASE_URL: {
      type: 'url',
      required: true,
      description: 'PostgreSQL connection string',
      sensitive: true, // Mark as sensitive for encryption/masking
    },
    NODE_ENV: {
      type: 'enum',
      enum: ['development', 'production', 'test'],
      required: true,
    },
  },
  autoCreate: true,  // (Default: true) Creates .env if missing
  autoPopulate: true, // (Default: true) Fills with default values
  strict: true,      // Enable strict mode
});

// Access validated and typed values
const env = envGuard.getAll();
console.log(`Server running on port ${env.PORT}`);
console.log(`Running in mode: ${env.NODE_ENV}`);
```

### 2. TypeScript Integration (Type Safety)

Generate a type definition file to get full autocomplete and type safety for `process.env`.

```typescript
// After defining envGuard
envGuard.generateTypes('./types/env.d.ts');
```

Now, you can use `process.env` directly with full type support:

```typescript
// In any file in your project
const port: number = process.env.PORT; // TypeScript knows this is a number
const dbUrl: string = process.env.DATABASE_URL; // And this is a string
```

---

## 📚 Schema Definition

### Supported Types

| Type | Description | Example |
| :--- | :--- | :--- |
| `string` | Standard string value | `"hello"` |
| `number` | Numeric value (integer or float) | `42` |
| `boolean` | Boolean value (parses `true`, `false`, `1`, `0`) | `true` |
| `enum` | One of predefined string values | `["dev", "prod"]` |
| `url` | Valid URL string | `https://api.example.com` |
| `email` | Valid email address string | `user@example.com` |
| `port` | Port number (1-65535) | `3000` |
| `json` | Valid JSON object or array | `{"key": "value"}` |

### `EnvFieldConfig` Options

The configuration object for each environment variable:

| Option | Type | Description |
| :--- | :--- | :--- |
| `required` | `boolean` | Is this field required? (Default: `false`) |
| `default` | `any` | Default value if not provided. |
| `description` | `string` | Human-readable description used in the generated `.env` file. |
| `example` | `string` | Example value used in the generated `.env` file. |
| `min`/`max` | `number` | Minimum/maximum value (for numbers and strings). |
| `pattern` | `RegExp` | Regex pattern for value validation. |
| `transform` | `(val) => any` | Function to transform the value after parsing. |
| `validate` | `(val) => boolean \| string` | Custom validation function. Returns `true` for valid or an error message string. |
| `sensitive` | `boolean` | Marks the variable as sensitive (for encryption, masking, and exclusion from Swagger). |
| `deprecated` | `boolean \| string` | Marks the variable as deprecated, issuing a warning on use. |
| `group` | `string` | Logical group name for organizing the generated `.env` file. |

---

## 🎨 Advanced Examples

### 1. Custom Validation and Transforms

Combine custom logic to ensure data integrity and format.

```typescript
const envGuard = createEnvGuard({
  schema: {
    APP_VERSION: {
      type: 'string',
      required: true,
      validate: (value) => {
        if (!/^\d+\.\d+\.\d+$/.test(value)) {
          return 'Version must be in format X.Y.Z';
        }
        return true;
      },
    },
    MAX_FILE_SIZE_MB: {
      type: 'number',
      default: 10,
      description: 'Max file size in MB',
      transform: (mb) => mb * 1024 * 1024, // Convert MB to bytes
    },
  },
});

const env = envGuard.getAll();
console.log(env.MAX_FILE_SIZE_MB); // Outputs value in bytes
```

### 2. Encryption for Sensitive Data

Enable encryption globally and mark specific fields as sensitive.

```typescript
const envGuard = createEnvGuard({
  schema: {
    JWT_SECRET: {
      type: 'string',
      required: true,
      sensitive: true, // This value will be encrypted
    },
  },
  encrypt: true, // Enable encryption globally
  encryptionKey: process.env.MASTER_KEY, // Master key for AES-256-GCM
});

// Values are automatically encrypted in the .env file
// and decrypted automatically when accessed via envGuard.get() or envGuard.getAll()
```

### 3. Hot Reload and Runtime Update

Listen for changes in the `.env` file and programmatically update values.

```typescript
const envGuard = createEnvGuard({
  schema: { /* ... */ },
  watch: true, // Enable file watching
});

// Listen for .env file changes
envGuard.on('reload', (newEnv) => {
  console.log('🔄 Configuration reloaded!');
  // Re-initialize any components that depend on the config
});

// Listen for programmatic updates
envGuard.on('update', (key, value) => {
  console.log(`✅ ${key} updated to ${value}`);
});

// Programmatically update a value (updates process.env and the .env file)
envGuard.update('PORT', 8080);
```

### 4. Decorator-Based Schema Definition

For class-based applications, you can define your schema using decorators.

```typescript
import { EnvClass, EnvField } from 'envguard/decorators';

@EnvClass()
class Config {
  @EnvField({ type: 'port', default: 3000, description: 'Server Port' })
  PORT: number;

  @EnvField({ type: 'url', required: true, sensitive: true })
  DATABASE_URL: string;
}

// The schema is extracted from the class
const envGuard = createEnvGuard({
  schema: Config, // Pass the class as the schema
});

const config = envGuard.getAll();
console.log(config.PORT); // 3000
```

---

## 🛠️ Integrations

### Express.js

Use `EnvGuardExpress` to inject validated environment variables into the request object (`req.env`) and add a health check endpoint.

```typescript
import express from 'express';
import { createEnvGuard, EnvGuardExpress } from 'envguard';

const app = express();
const envGuard = createEnvGuard({ /* schema */ });

const envMiddleware = new EnvGuardExpress(envGuard);

// 1. Inject middleware
app.use(envMiddleware.middleware());

// 2. Add health check endpoint
app.get('/health', envMiddleware.healthCheck());

// Access variables in routes
app.get('/api/config', (req, res) => {
  // req.env is the validated, typed environment object
  res.json({
    environment: req.env.NODE_ENV,
    port: req.env.PORT,
  });
});
```

### NestJS

The `EnvGuardModule` provides a full-featured integration for NestJS, including providers for the `EnvGuard` instance and a type-safe `EnvGuardService`.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { EnvGuardModule } from 'envguard/nestjs';
import { schema } from './envguard.config';

@Module({
  imports: [
    EnvGuardModule.forRoot({
      schema,
      strict: true,
      watch: process.env.NODE_ENV === 'development',
    }),
  ],
})
export class AppModule {}

// app.service.ts
import { Injectable } from '@nestjs/common';
import { EnvGuardService } from 'envguard/nestjs';

interface Env {
  PORT: number;
  NODE_ENV: 'development' | 'production';
}

@Injectable()
export class AppService {
  constructor(private readonly envService: EnvGuardService<Env>) {
    // Access type-safe environment variables
    console.log(`Server port: ${this.envService.get('PORT')}`);

    // Listen for hot reloads
    this.envService.onChange((newEnv) => {
      console.log('NestJS config reloaded!');
    });
  }
}
```

### Swagger/OpenAPI

Automatically generate Swagger/OpenAPI schema documentation from your environment schema using `EnvGuardSwagger`. Sensitive fields are automatically excluded.

```typescript
import { EnvGuardSwagger } from 'envguard';

// Generate the Swagger schema component
const swaggerDoc = EnvGuardSwagger.generateSwaggerDoc(envGuard.schema);

// Integrate into your Swagger setup
app.get('/swagger.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'My API',
      version: '1.0.0',
    },
    components: {
      schemas: swaggerDoc.components.schemas,
    },
  });
});
```

---

## 🔧 CLI Usage

EnvGuard includes a powerful command-line interface (`npx envguard`) for common tasks.

### Commands

| Command | Description | Options | Example |
| :--- | :--- | :--- | :--- |
| `init [template]` | Initializes a new project with a config file and `.env.example`. | `[template]` (basic, advanced, express, minimal, microservices, ecommerce) | `npx envguard init express` |
| `validate` | Validates the current environment against the schema. | `--file, -f <file>` (default: `.env`), `--verbose` | `npx envguard validate -f .env.production` |
| `generate` | Generates the TypeScript type definitions file. | `--output, -o <path>` (default: `types/env.d.ts`) | `npx envguard generate -o ./types/env.d.ts` |
| `encrypt` | Encrypts a sensitive value manually. | `--key, -k <key>`, `--value, -v <value>` | `npx envguard encrypt -k MASTER_KEY -v "my-secret"` |
| `decrypt` | Decrypts an encrypted value manually. | `--key, -k <key>`, `--value, -v <value>` | `npx envguard decrypt -k MASTER_KEY -v "Enc.AES-256-GCM..."` |
| `export` | Exports the validated configuration to a file. | `--output, -o <path>`, `--format <format>` (json, yaml, env) | `npx envguard export -o config.json --format json` |
| `diff [file1] [file2]` | Compares two environment files. | `--file, -f <file>` (default: `.env`), `[file2]` (default: `.env.example`) | `npx envguard diff .env .env.production` |
| `docs` | Generates Markdown documentation for the environment schema. | `--output, -o <path>` (default: `ENV_DOCS.md`) | `npx envguard docs -o ENV_DOCS.md` |
| `info` | Shows a summary of the environment configuration (total, required, sensitive, by type/group). | N/A | `npx envguard info` |
| `sync` | Synchronizes the `.env.example` file with the schema, adding missing variables. | N/A | `npx envguard sync` |
| `doctor` | Runs a diagnostic health check on the setup (schema, `.env`, types, etc.). | N/A | `npx envguard doctor` |
| `version` | Shows the version number. | N/A | `npx envguard version` |
| `help` | Shows the help message. | N/A | `npx envguard help` |

### Global Options

| Option | Description |
| :--- | :--- |
| `--quiet, -q` | Suppress all informational output. |
| `--verbose` | Show detailed output, including error stack traces. |

### Manual Encryption Example

```bash
# Encrypt the value "my-secret-key" using the master key
# Note: MASTER_KEY must be set as an environment variable or passed via the CLI
MASTER_KEY="my-master-key-32-chars" npx envguard encrypt --key JWT_SECRET --value "my-secret-key"
# Output: Enc.AES-256-GCM.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
You can then place the encrypted value directly into your `.env` file.

---

## 🔒 Security Best Practices

1.  **Never commit `.env` files** to version control (Git). Use the generated `.env.example` instead.
2.  **Use encryption** (`sensitive: true` and `encrypt: true`) for all production secrets.
3.  **Use a unique Master Key** for each environment (development, staging, production).
4.  **Mark sensitive fields** (`sensitive: true`) to prevent accidental logging and exclusion from documentation.
5.  **Enable Strict Mode** (`strict: true`) to catch typos and unknown variables early.

---

## 🤝 Comparison with Other Tools

| Feature | EnvGuard | dotenv | env-var | joi + dotenv |
|---------|----------|--------|---------|--------------|
| Type Validation | ✅ | ❌ | ✅ | ✅ |
| Auto-generation | ✅ | ❌ | ❌ | ❌ |
| TypeScript Types | ✅ Auto | ❌ | ❌ | ❌ |
| Encryption | ✅ Built-in | ❌ | ❌ | ❌ |
| Hot Reload | ✅ | ❌ | ❌ | ❌ |
| Swagger Integration | ✅ | ❌ | ❌ | ❌ |
| Custom Transforms | ✅ | ❌ | ✅ | ✅ |
| Deprecation Warnings | ✅ | ❌ | ❌ | ❌ |
| CLI Tools | ✅ | ❌ | ❌ | ❌ |
| Zero Dependencies | ✅ | ✅ | ❌ | ❌ |

---

## 📖 API Reference

### `createEnvGuard(options)`

Creates a new EnvGuard instance.

**Options:**
- `schema` - Environment variable schema definition
- `envPath` - Path to .env file (default: `.env`)
- `autoCreate` - Auto-create .env if missing (default: `true`)
- `autoPopulate` - Fill with default values (default: `true`)
- `strict` - Reject unknown variables (default: `false`)
- `cache` - Cache parsed values (default: `true`)
- `watch` - Watch for file changes (default: `false`)
- `encrypt` - Enable encryption (default: `false`)
- `encryptionKey` - Encryption key for sensitive fields
- `onError` - Error callback
- `onWarning` - Warning callback

### `envGuard.get<T>(key: string): T`

Get a single environment variable value.

### `envGuard.getAll(): ParsedEnv`

Get all environment variables.

### `envGuard.update(key: string, value: any): void`

Update an environment variable.

### `envGuard.generateTypes(outputPath: string): void`

Generate TypeScript type definitions.

### `envGuard.on(event, callback)`

Listen to events (`reload`, `update`, `error`).

---

## 🐛 Troubleshooting

### Common Issues

**Issue: "Required field is missing"**
- Make sure the field exists in your `.env` file
- Check if `autoPopulate` is enabled
- Verify the field name matches exactly (case-sensitive)

**Issue: "Invalid type"**
- Check the value format matches the type
- Use `example` in schema to see expected format
- Try `validate` callback for debugging

**Issue: "Encryption failed"**
- Ensure `encryptionKey` is at least 32 characters
- Use same key for encryption and decryption
- Check if value was already encrypted

---

## 🤝 Contributing

We welcome contributions! If you have a suggestion for an improvement or find a bug, please open an issue or a pull request.

---

## 📄 License

This project is licensed under the MIT License.

**EnvGuard** - Type-safe, validated, and encrypted environment variables for Node.js.
