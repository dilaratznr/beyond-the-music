import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * Server-only: this module imports `revalidateTag` from `next/cache`, which
 * MUST NOT land in a client bundle. Pure datetime-local helpers that clients
 * also use live in `src/lib/datetime-local.ts`.
 *
 * Scheduled articles live in a pending state: `status = SCHEDULED` with a
 * future `publishedAt`. When the clock catches up, we flip them to PUBLISHED
 * so the public site renders them without any cron infrastructure.
 *
 * This is a single UPDATE with a cheap WHERE — safe to call on every request
 * that surfaces articles to the public. Callers should `await` it before the
 * findMany/findUnique that might include the newly-due row.
 */
export async function publishDueArticles(): Promise<number> {
  try {
    const res = await prisma.article.updateMany({
      where: {
        status: 'SCHEDULED',
        publishedAt: { lte: new Date() },
      },
      data: { status: 'PUBLISHED' },
    });
    if (res.count > 0) {
      revalidateTag(CACHE_TAGS.article, 'max');
    }
    return res.count;
  } catch {
    // Never let the tick break the page render — worst case: a scheduled
    // article shows up a request later, when the next caller tries again.
    return 0;
  }
}
