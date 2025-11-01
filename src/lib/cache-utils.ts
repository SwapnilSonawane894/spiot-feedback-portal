import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 300, // 5 minutes standard TTL
  checkperiod: 60 // Check for expired keys every 1 minute
});

export const CACHE_KEYS = {
  DEPARTMENT_SUBJECTS: 'dept_subjects_',
  STUDENT_TASKS: 'student_tasks_',
  FACULTY_ASSIGNMENTS: 'faculty_assignments_'
};

export function getCacheKey(prefix: string, id: string): string {
  return `${prefix}${id}`;
}

export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached) return cached;

  const fresh = await fetchFn();
  cache.set(key, fresh, ttl);
  return fresh;
}

export function invalidateCache(prefix: string): void {
  const keys = cache.keys().filter((k: string) => k.startsWith(prefix));
  cache.del(keys);
}

export function invalidateAllCache(): void {
  cache.flushAll();
}

export const cacheUtils = {
  getCacheKey,
  getCachedOrFetch,
  invalidateCache,
  invalidateAllCache
};