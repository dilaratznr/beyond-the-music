/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for a single-instance deployment. For multi-instance production,
 * swap for Redis/Upstash.
 */

type Bucket = { timestamps: number[] };
const buckets = new Map<string, Bucket>();

const CLEANUP_EVERY = 1000;
let callsSinceCleanup = 0;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInMs: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  callsSinceCleanup++;
  if (callsSinceCleanup >= CLEANUP_EVERY) {
    callsSinceCleanup = 0;
    for (const [k, b] of buckets.entries()) {
      b.timestamps = b.timestamps.filter((t) => t >= cutoff);
      if (b.timestamps.length === 0) buckets.delete(k);
    }
  }

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t >= cutoff);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    return {
      success: false,
      remaining: 0,
      resetInMs: Math.max(0, oldest + windowMs - now),
    };
  }

  bucket.timestamps.push(now);
  return {
    success: true,
    remaining: limit - bucket.timestamps.length,
    resetInMs: windowMs,
  };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
