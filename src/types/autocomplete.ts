/**
 * Type-safe environment variable access with autocomplete
 */
export type EnvKey<T> = keyof T & string;

export interface TypedEnvGuard<T> {
  /**
   * Get environment variable with full type safety and autocomplete
   */
  get<K extends EnvKey<T>>(key: K): T[K];

  /**
   * Get all environment variables
   */
  getAll(): T;

  /**
   * Update environment variable with type checking
   */
  update<K extends EnvKey<T>>(key: K, value: T[K]): void;

  /**
   * Generate TypeScript type definitions
   */
  generateTypes(outputPath: string): void;

  /**
   * Watch for changes
   */
  on(event: 'reload', callback: (env: T) => void): void;
  on(event: 'update', callback: <K extends EnvKey<T>>(key: K, value: T[K]) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
}