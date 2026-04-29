/**
 * Sliding-window rate limiter — Upstash Redis backend with in-memory fallback.
 *
 * Strategy:
 *   - UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN tanımlıysa Redis kullan.
 *     Sliding-window: ZADD (now) + ZREMRANGEBYSCORE (cutoff) + ZCARD + EXPIRE,
 *     tek round-trip pipeline ile. Multi-instance / serverless'te tutarlı.
 *   - Aksi takdirde in-memory Map'e düş — single-instance dev için yeterli,
 *     production'da idempotent değil (her cold start sıfırlanır).
 *
 * NEDEN package değil REST? `@upstash/ratelimit` opsiyonel bir bağımlılık;
 * deploy etmeden önce kurmak zorunda kalmamak için fetch ile Upstash'in
 * REST endpoint'ini doğrudan kullanıyoruz. Aynı sliding-window mantığı,
 * sıfır npm install.
 *
 * Tüm public API ASYNC oldu — caller'ların `await` etmesi gerekiyor.
 */

import { NextResponse } from 'next/server';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInMs: number;
}

// ─── In-memory backend ─────────────────────────────────────────────────────
//
// Process-local state. Cold start veya multi-instance'da kayboluyor — bu yüzden
// production'da Upstash şart. Dev / test / Upstash erişilemez fallback için.

type Bucket = { timestamps: number[] };
const buckets = new Map<string, Bucket>();
const CLEANUP_EVERY = 1000;
let callsSinceCleanup = 0;

function rateLimitInMemory(
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

// ─── Upstash Redis backend ─────────────────────────────────────────────────
//
// REST pipeline: ZADD + ZREMRANGEBYSCORE + ZCARD + PEXPIRE atomically. Sorted
// set elemanları: score=timestamp, member=timestamp+random (collision-safe).
// Kapasite aşılırsa son ZADD'i geri almıyoruz — bir sonraki çağrıda nasıl
// olsa kapı dışı bırakılır; en kötü senaryoda 1 isteklik leak olur ki bu da
// gerçek bir rate limiter için kabul edilebilir. Strict atomicity isteyen
// implementasyonlar Lua script kullanır; biz sadeliği seçtik.

interface UpstashConfig {
  url: string;
  token: string;
}

function getUpstashConfig(): UpstashConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function rateLimitUpstash(
  cfg: UpstashConfig,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const cutoff = now - windowMs;
  // Aynı ms'de art arda gelen iki istek aynı member'ı yazmasın diye salt.
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  const redisKey = `rl:${key}`;

  // Pipeline: 4 komut tek HTTP round-trip ile.
  const pipeline = [
    ['ZREMRANGEBYSCORE', redisKey, '-inf', String(cutoff)],
    ['ZADD', redisKey, String(now), member],
    ['ZCARD', redisKey],
    ['PEXPIRE', redisKey, String(windowMs * 2)],
  ];

  let count: number;
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
      // Cron / serverless'te 5 sn'de cevap gelmediyse Upstash'i atla,
      // requests'i bloke etme.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const json = (await res.json()) as Array<{ result: number | string }>;
    count = Number(json[2]?.result ?? 0);
  } catch (err) {
    // Network / timeout → in-memory'e düş. Her istanstaki bucket farklı
    // olacak ama hiç limit yokmaktan iyi.
    console.warn('[rate-limit] Upstash unavailable, falling back to in-memory:', err);
    return rateLimitInMemory(key, limit, windowMs);
  }

  if (count > limit) {
    return {
      success: false,
      remaining: 0,
      resetInMs: windowMs,
    };
  }
  return {
    success: true,
    remaining: limit - count,
    resetInMs: windowMs,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Sliding-window rate limit — async. Upstash konfigüre edilmişse multi-
 * instance tutarlı, yoksa in-memory (single-instance) fallback.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const upstash = getUpstashConfig();
  if (upstash) return rateLimitUpstash(upstash, key, limit, windowMs);
  return rateLimitInMemory(key, limit, windowMs);
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

/**
 * Public-facing GET endpoint'lerine tek satırla rate-limit takmak için
 * yardımcı. Limit'in üstüne çıkıldığında 429 + `Retry-After` döner;
 * altında null dönüp normal akışa devam ettirir.
 *
 * Varsayılan: IP başına dakikada 60 istek — normal kullanıcı browse'unu
 * etkilemeyecek kadar yumuşak ama scrape/DDoS botlarının pratik hızını
 * kırıyor. Endpoint başına özelleştirmek için limit/windowMs ver.
 */
export async function publicApiRateLimit(
  req: Request,
  routeKey: string,
  limit = 60,
  windowMs = 60_000,
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const result = await rateLimit(`public:${routeKey}:${ip}`, limit, windowMs);
  if (result.success) return null;
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil(result.resetInMs / 1000)),
      },
    },
  );
}
