/**
 * Cache em memória com TTL para reduzir chamadas Firestore repetidas
 * durante navegação (cada SPA rerender refazia queries).
 *
 * Não é cache persistente — limpa em refresh. Para persistir, usar localStorage.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

export const CACHE_TTL = {
  SHORT: 30_000, // 30s — listagens que mudam com frequência
  MEDIUM: 2 * 60_000, // 2min — dados que raramente mudam em uma sessão
  LONG: 10 * 60_000, // 10min — configs, info de cliente
} as const;

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.SHORT
): Promise<T> {
  const now = Date.now();
  const hit = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const value = await fetcher();
  memoryCache.set(key, { value, expiresAt: now + ttl });
  return value;
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  Array.from(memoryCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  });
}
