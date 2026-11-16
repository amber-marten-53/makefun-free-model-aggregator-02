export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  size: number;
}

export class TtlCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number }>();
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private evictions = 0;

  private maxEntries: number;
  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  set(key: K, value: V, ttlMs: number): void {
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.evictions++;
      }
    }
    this.cache.set(key, { value, expiry: Date.now() + ttlMs });
    this.sets++;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  clearExpired(): number {
    let count = 0;
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  stats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      evictions: this.evictions,
      size: this.cache.size,
    };
  }
}

export function hashKey(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(hashKey).join(',')}]`;
  }
  const sortedKeys = Object.keys(value).sort();
  const obj: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    obj[key] = (value as Record<string, unknown>)[key];
  }
  return JSON.stringify(obj, sortedKeys);
}

export class CatalogCache<T> {
  private cache = new TtlCache<string, { value: T; timestamp: number }>(1);
  private lastValue: T | undefined;

  private ttlMs: number;
  constructor(ttlMs: number = 60000) {
    this.ttlMs = ttlMs;
  }

  getCatalog(fetcher: () => Promise<T>): { value: T | undefined; stale: boolean } {
    const cached = this.cache.get('catalog');
    if (cached) {
      return { value: cached.value, stale: false };
    }
    if (this.lastValue) {
      return { value: this.lastValue, stale: true };
    }
    return { value: undefined, stale: true };
  }

  async update(fetcher: () => Promise<T>): Promise<void> {
    const value = await fetcher();
    this.lastValue = value;
    this.cache.set('catalog', { value, timestamp: Date.now() }, this.ttlMs);
  }
}
