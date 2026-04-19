import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';

/**
 * Search pool for the featured-items picker. Returns up to 20 matches for
 * a kind (article | album), optionally filtered by a text query.
 *
 * Notes:
 *   - We intentionally do NOT exclude already-featured rows server-side.
 *     The admin UI hides them in the picker based on the current in-memory
 *     list, which keeps the UX snappy when you're drag-dropping without
 *     having to re-fetch the pool after every change.
 *   - Articles are shown regardless of status so the editor can schedule a
 *     draft to appear as featured once it's published.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth('EDITOR');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind');
  const q = (searchParams.get('q') || '').trim();
  const take = 20;
  const ci = 'insensitive' as const;

  if (kind !== 'article' && kind !== 'album') {
    return NextResponse.json({ error: 'kind must be "article" or "album"' }, { status: 400 });
  }

  if (kind === 'article') {
    const articles = await prisma.article.findMany({
      where: q
        ? {
            OR: [
              { titleTr: { contains: q, mode: ci } },
              { titleEn: { contains: q, mode: ci } },
            ],
          }
        : undefined,
      take,
      orderBy: q ? { titleTr: 'asc' } : { updatedAt: 'desc' },
      select: {
        id: true,
        titleTr: true,
        category: true,
        featuredImage: true,
        status: true,
        featuredOrder: true,
      },
    });
    return NextResponse.json({ results: articles });
  }

  const albums = await prisma.album.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: ci } },
            { artist: { name: { contains: q, mode: ci } } },
          ],
        }
      : undefined,
    take,
    orderBy: q ? { title: 'asc' } : { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      coverImage: true,
      artist: { select: { name: true } },
      featuredOrder: true,
    },
  });
  return NextResponse.json({ results: albums });
}
