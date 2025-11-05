import { ParsedEnv } from '../types';
import React, { createContext, useContext, ReactNode } from 'react';

interface EnvContextValue {
  env: ParsedEnv;
  get: <T = any>(key: string) => T;
}

const EnvContext = createContext<EnvContextValue | null>(null);
interface EnvProviderProps {
  env: ParsedEnv;
  children: ReactNode;
}

/**
 * React Context Provider for environment variables
 */
export function EnvProvider({ env, children }: EnvProviderProps) {
  const value: EnvContextValue = {
    env,
    get: <T = any>(key: string): T => env[key] as T,
  };

  return <EnvContext.Provider value={value}>{children}</EnvContext.Provider>;
}

/**
 * Hook to access environment variables
 */
export function useEnv<T = ParsedEnv>(): T & { get: <K extends keyof T>(key: K) => T[K] } {
  const context = useContext(EnvContext);
  
  if (!context) {
    throw new Error('useEnv must be used within EnvProvider');
  }

  return {
    ...context.env as T,
    get: <K extends keyof T>(key: K) => context.env[key as string] as T[K],
  };
}

/**
 * Hook to get single environment variable
 */
export function useEnvVar<T = any>(key: string): T {
  const context = useContext(EnvContext);
  
  if (!context) {
    throw new Error('useEnvVar must be used within EnvProvider');
  }

  return context.env[key] as T;
}

/**
 * Higher-order component to inject env as props
 */
export function withEnv<P extends { env?: ParsedEnv }>(
  Component: React.ComponentType<P>
): React.FC<Omit<P, 'env'>> {
  return (props: Omit<P, 'env'>) => {
    const context = useContext(EnvContext);
    
    if (!context) {
      throw new Error('withEnv must be used within EnvProvider');
    }

    return <Component {...(props as P)} env={context.env} />;
  };
}