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

  const statements: [string, string][] = [
    ['Article.featured_order', 'ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "featured_order" INTEGER'],
    ['Article.featured_order idx', 'CREATE INDEX IF NOT EXISTS "Article_featured_order_idx" ON "Article"("featured_order")'],
    ['Album.featured_order', 'ALTER TABLE "Album" ADD COLUMN IF NOT EXISTS "featured_order" INTEGER'],
    ['Album.featured_order idx', 'CREATE INDEX IF NOT EXISTS "Album_featured_order_idx" ON "Album"("featured_order")'],
  ];

  for (const [label, sql] of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      // Don't crash the server if the bootstrap fails — log and move on
      // so the rest of the app still starts. The admin error boundary
      // will surface any actual query failures downstream.
      console.warn(`[instrumentation] schema patch failed (${label}):`, err);
    }
  }
}
