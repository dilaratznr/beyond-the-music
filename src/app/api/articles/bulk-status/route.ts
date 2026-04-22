import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * POST /api/articles/bulk-status
 * Body: { ids: string[], status: 'PUBLISHED' | 'DRAFT' }
 *
 * The single-article PUT handler carefully preserves the original
 * publishedAt when a piece is already live; the bulk version keeps that
 * invariant by fetching the current rows first and then writing each
 * update individually inside a transaction. For DRAFT we null out
 * publishedAt so the row no longer surfaces on the site.
 *
 * SCHEDULED is deliberately excluded — each article needs its own
 * target date which doesn't make sense as a bulk action.
 */
export async function POST(request: NextRequest) {
  const { error } = await requireSectionAccess('ARTICLE', 'canPublish');
  if (error) return error;

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((x: unknown): x is string => typeof x === 'string')
    : [];
  const status = body?.status;
  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids gerekli' }, { status: 400 });
  }
  if (status !== 'PUBLISHED' && status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'status PUBLISHED veya DRAFT olmalı' },
      { status: 400 },
    );
  }

  const existing = await prisma.article.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true, publishedAt: true },
  });

  const now = new Date();
  const updates = existing.map((a) => {
    if (status === 'PUBLISHED') {
      const publishedAt =
        a.status === 'PUBLISHED' && a.publishedAt ? a.publishedAt : now;
      return prisma.article.update({
        where: { id: a.id },
        data: { status: 'PUBLISHED', publishedAt },
      });
    }
    return prisma.article.update({
      where: { id: a.id },
      data: { status: 'DRAFT', publishedAt: null },
    });
  });

  const results = await prisma.$transaction(updates);
  revalidateTag(CACHE_TAGS.article, 'max');
  return NextResponse.json({ success: true, updated: results.length });
}
