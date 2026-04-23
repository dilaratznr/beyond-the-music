import { PrismaClient } from '@prisma/client';

/**
 * On Vercel (serverless), every function invocation can spin up a fresh
 * Prisma client. With the default per-client pool size (~10), a bursty
 * page load saturates the database's connection cap — the log shows up
 * as `PrismaClientInitializationError: ... Too many connections`.
 *
 * The usual fix is `?connection_limit=1` on the URL, but on Vercel the
 * `DATABASE_URL` env var is often synced / locked by the DB provider
 * integration (Prisma Postgres, Neon marketplace, etc.) and can't be
 * edited by hand. So we inject the parameter at runtime here.
 *
 * `connection_limit=3` balances two concerns:
 *   - Low enough that a burst of concurrent function instances doesn't
 *     saturate the provider's hard limit (Prisma Postgres free tier
 *     gives us enough headroom even with dozens of instances × 3).
 *   - High enough that a page with a `Promise.all` of several parallel
 *     queries (e.g. the home page fires 8 reads at once) doesn't
 *     serialize them all behind a single connection.
 *
 * `pool_timeout=20` keeps a request alive up to 20s while waiting for
 * a free connection (default is 10s, a bit tight during cold starts).
 */
function buildDatasourceUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;

  // Don't re-append if the user already set these explicitly (e.g. local
  // dev where `.env` has `?connection_limit=5`).
  if (base.includes('connection_limit=')) return base;

  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}connection_limit=3&pool_timeout=20`;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: buildDatasourceUrl(),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
