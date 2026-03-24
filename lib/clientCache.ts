/**
 * Module-level in-memory cache for client-side data fetching.
 * Lives as a JS module singleton — persists for the entire browser session
 * regardless of React component mount/unmount cycles.
 *
 * Use cache-then-revalidate pattern:
 *   1. On cache hit: render immediately, then background-fetch for freshness.
 *   2. On cache miss: fetch normally, store result.
 *   3. On mutation: call invalidate() so the next fetch treats it as a miss.
 */

const store = new Map<string, unknown>();

export const clientCache = {
  get<T>(key: string): T | undefined {
    return store.get(key) as T | undefined;
  },

  set<T>(key: string, value: T): void {
    store.set(key, value);
  },

  delete(key: string): void {
    store.delete(key);
  },

  /** Delete all keys that start with `prefix` (e.g. '/api/recipes' wipes list + all detail keys). */
  invalidate(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },

  clear(): void {
    store.clear();
  },
};
