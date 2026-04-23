/**
 * One-time bootstrap hook.
 *
 * Next.js 16 calls `register()` exactly once per server instance, before
 * any requests are handled. We use it to ensure the database schema has
 * caught up with the Prisma client's expectations for columns that were
 * added to prisma/schema.prisma but never run through `prisma db push`
 * on this machine.
 *
 * At the moment that means the `featured_order` columns on Article and
 * Album (used by the "Öne Çıkarılanlar" management page). If they're
 * already present, each statement is a no-op thanks to `IF NOT EXISTS`.
 *
 * Edge runtime is explicitly skipped — it can't open a Postgres
 * connection, and the dev server will try to load this file for both
 * runtimes by default.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Imported lazily so the edge runtime doesn't even try to parse the
  // Prisma client.
  const { default: prisma } = await import('@/lib/prisma');

  // DDL statements are written inline as tagged template literals so
  // `$executeRaw` enforces the safety contract: no string concatenation,
  // no `$executeRawUnsafe`, no user input. If this bootstrap ever needs
  // a value (not identifier) from outside, Prisma will interpolate it
  // as a parameter — preventing SQL injection by construction. Each
  // block is wrapped in its own try so a failure on one doesn't skip
  // the rest.
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
      // Don't crash the server if the bootstrap fails — log and move on
      // so the rest of the app still starts. The admin error boundary
      // will surface any actual query failures downstream.
      console.warn(`[instrumentation] schema patch failed (${label}):`, err);
    }
  }
}
