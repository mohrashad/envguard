import { EnvGuard } from './envguard';
import { EnvGuardOptions } from '../types';
import { TypedEnvGuard, EnvKey } from '../types/autocomplete';

/**
 * Create a strongly-typed EnvGuard instance
 */
export function createTypedEnvGuard<T>(options: EnvGuardOptions): TypedEnvGuard<T> {
    const envGuard = new EnvGuard(options);

    return {
        get: <K extends EnvKey<T>>(key: K): T[K] => {
            return envGuard.get<T[K]>(key as string);
        },

        getAll: (): T => {
            return envGuard.getAll() as T;
        },

        update: <K extends EnvKey<T>>(key: K, value: T[K]): void => {
            envGuard.update(key as string, value);
        },

        generateTypes: (outputPath: string): void => {
            envGuard.generateTypes(outputPath);
        },

        on: ((event: string, callback: Function): void => {
            envGuard.on(event as any, callback as any);
        }) as TypedEnvGuard<T>['on'],
    };
}