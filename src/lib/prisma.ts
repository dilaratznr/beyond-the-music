import { PrismaClient } from '@prisma/client';

/**
 * Vercel serverless: inject connection_limit=3 & pool_timeout=20 at
 * runtime (DATABASE_URL often locked by provider integrations). Balances
 * burst safety with parallel query throughput.
 */
function buildDatasourceUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;

  // Skip if already set (e.g. local dev with explicit .env params).
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
