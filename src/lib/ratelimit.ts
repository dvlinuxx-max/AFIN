// In-memory fixed-window rate limiter. Suitable for a single self-hosted instance;
// swap for Redis if AFIN is ever run behind multiple replicas.

interface Bucket {
  count: number;
  reset: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.reset < now) buckets.delete(key);
  }
}

export interface RateResult {
  ok: boolean;
  retryAfter: number; // seconds
  remaining: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0, remaining: limit - 1 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000), remaining: 0 };
  }
  return { ok: true, retryAfter: 0, remaining: limit - b.count };
}

// Drop the counter for a key, e.g. after a successful login.
export function rateLimitReset(key: string) {
  buckets.delete(key);
}
