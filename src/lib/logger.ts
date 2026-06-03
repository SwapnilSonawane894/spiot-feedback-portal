// Development logging utility
const isDev = process.env.NODE_ENV === 'development';

interface LogOptions {
  level?: 'info' | 'warn' | 'error' | 'debug';
  context?: string;
  data?: any;
}

export const logger = {
  info: (message: string, options?: LogOptions) => {
    // Logging disabled
  },

  warn: (message: string, options?: LogOptions) => {
    // Logging disabled
  },

  error: (message: string, error?: any, options?: LogOptions) => {
    // Logging disabled
  },

  debug: (message: string, options?: LogOptions) => {
    // Logging disabled
  },

  // Special method for logging API requests in development
  api: (method: string, path: string, statusCode: number, durationMs: number) => {
    // Logging disabled
  }
};

// Utility to measure API response times
export const measureTime = () => {
  const start = Date.now();
  return () => Date.now() - start;
};