/**
 * Bootstrap hook: Next.js calls register() once before serving requests.
 * Applies schema patches (featured_order columns) via IF NOT EXISTS.
 * Skips edge runtime (no DB connection).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Lazy import to prevent edge runtime from parsing Prisma client.
  const { default: prisma } = await import('@/lib/prisma');

  // DDL as tagged literals for safety (Prisma parameterizes values, preventing injection).
  const runs: Array<{ label: string; fn: () => Promise<unknown> }> = [
    {
      label: 'Article.featured_order',
      fn: () =>
        prisma.$executeRaw`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "featured_order" INTEGER`,
    },
    {
      label: 'Article.featured_order idx',
      fn: () =>
        prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Article_featured_order_idx" ON "Article"("featured_order")`,
    },
    {
      label: 'Album.featured_order',
      fn: () =>
        prisma.$executeRaw`ALTER TABLE "Album" ADD COLUMN IF NOT EXISTS "featured_order" INTEGER`,
    },
    {
      label: 'Album.featured_order idx',
      fn: () =>
        prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Album_featured_order_idx" ON "Album"("featured_order")`,
    },
  ];

  for (const { label, fn } of runs) {
    try {
      await fn();
    } catch (err) {
      // Log but don't crash; downstream errors surfaced by error boundary.
      console.warn(`[instrumentation] schema patch failed (${label}):`, err);
    }
  }
}
