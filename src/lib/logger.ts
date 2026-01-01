// Development logging utility
const isDev = process.env.NODE_ENV === 'development';

interface LogOptions {
  level?: 'info' | 'warn' | 'error' | 'debug';
  context?: string;
  data?: any;
}

export const logger = {
  info: (message: string, options?: LogOptions) => {
    if (!isDev) return;
    // console.log(
      `ℹ️ [${options?.context || 'APP'}] ${message}`,
      options?.data || ''
    );
  },

  warn: (message: string, options?: LogOptions) => {
    if (!isDev) return;
    // console.warn(
      `⚠️ [${options?.context || 'APP'}] ${message}`,
      options?.data || ''
    );
  },

  error: (message: string, error?: any, options?: LogOptions) => {
    // Always log errors, even in production
    // console.error(
      `❌ [${options?.context || 'APP'}] ${message}`,
      error || '',
      options?.data || ''
    );
  },

  debug: (message: string, options?: LogOptions) => {
    if (!isDev) return;
    // console.debug(
      `🔍 [${options?.context || 'APP'}] ${message}`,
      options?.data || ''
    );
  },

  // Special method for logging API requests in development
  api: (method: string, path: string, statusCode: number, durationMs: number) => {
    if (!isDev) return;
    const emoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
    // console.log(`${emoji} ${method} ${path} ${statusCode} (${durationMs}ms)`);
  }
};

// Utility to measure API response times
export const measureTime = () => {
  const start = Date.now();
  return () => Date.now() - start;
};