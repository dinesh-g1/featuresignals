type Subscriber = () => void;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  subscribers: Set<Subscriber>;
}

const DEFAULT_STALE_TIME = 30_000; // 30 seconds

class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();
  private staleTime: number;

  constructor(staleTime = DEFAULT_STALE_TIME) {
    this.staleTime = staleTime;
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    return entry?.data as T | undefined;
  }

  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > this.staleTime;
  }

  set<T>(key: string, data: T): void {
    const existing = this.cache.get(key);
    if (existing) {
      existing.data = data;
      existing.timestamp = Date.now();
      existing.subscribers.forEach((fn) => fn());
    } else {
      this.cache.set(key, { data, timestamp: Date.now(), subscribers: new Set() });
    }
  }

  subscribe(key: string, fn: Subscriber): () => void {
    let entry = this.cache.get(key);
    if (!entry) {
      entry = { data: undefined, timestamp: 0, subscribers: new Set() };
      this.cache.set(key, entry);
    }
    entry.subscribers.add(fn);
    return () => {
      entry!.subscribers.delete(fn);
    };
  }

  async fetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;

    const promise = fetcher()
      .then((data) => {
        this.set(key, data);
        return data;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  invalidate(keyOrPrefix: string): void {
    for (const [key, entry] of this.cache) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix + ":")) {
        entry.timestamp = 0;
        entry.subscribers.forEach((fn) => fn());
      }
    }
  }

  invalidateExact(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.timestamp = 0;
      entry.subscribers.forEach((fn) => fn());
    }
  }

  clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }
}

export const queryCache = new QueryCache();
