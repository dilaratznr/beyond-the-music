import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { audit, extractContext } from '@/lib/audit-log';

/**
 * POST /api/articles/bulk-delete
 * Body: { ids: string[] }
 *
 * Deletes every matching article in one round-trip. Unknown IDs are
 * silently ignored (Prisma's `deleteMany` does not throw on a miss),
 * which lets the caller's optimistic UI treat the operation as
 * idempotent — re-clicking Sil after a partial failure won't error.
 */
export async function POST(request: NextRequest) {
  const { error, user } = await requireSectionAccess('ARTICLE', 'canDelete');
  if (error || !user) return error;

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown): x is string => typeof x === 'string') : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids gerekli' }, { status: 400 });
  }

  const result = await prisma.article.deleteMany({ where: { id: { in: ids } } });

  const ctx = extractContext(request);
  await audit({
    event: 'ARTICLE_BULK_DELETED',
    actorId: user.id,
    targetType: 'ARTICLE',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    detail: `${result.count} silindi · ids=${ids.slice(0, 10).join(',')}${ids.length > 10 ? '…' : ''}`,
  });

  revalidateTag(CACHE_TAGS.article, 'max');
  return NextResponse.json({ success: true, deleted: result.count });
}
