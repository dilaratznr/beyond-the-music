import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * Server-only: publishDueArticles() flips SCHEDULED → PUBLISHED when
 * publishedAt <= now. Cheap UPDATE, safe on every request (no cron needed).
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
    // Don't break render; scheduled article appears on next request.
    return 0;
  }
}
