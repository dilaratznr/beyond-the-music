import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';

/**
 * Admin endpoint for the "featured on homepage" curation:
 *
 *   GET  /api/admin/featured              → current featured lists + pools
 *   PUT  /api/admin/featured              → rewrite the order for a kind
 *
 * Featured state is stored as a nullable integer `featuredOrder` on each
 * Article and Album row. null = not featured, 0..N = position (asc).
 * We rewrite the whole list on save because the UI is drag-and-drop and
 * the blast radius is tiny (a dozen rows at most).
 */
const MAX_FEATURED = 12;

export async function GET() {
  const { error } = await requireAuth('EDITOR');
  if (error) return error;

  const [featuredArticles, featuredAlbums] = await Promise.all([
    prisma.article.findMany({
      where: { featuredOrder: { not: null } },
      orderBy: { featuredOrder: 'asc' },
      select: {
        id: true,
        titleTr: true,
        category: true,
        featuredImage: true,
        status: true,
        publishedAt: true,
        featuredOrder: true,
      },
    }),
    prisma.album.findMany({
      where: { featuredOrder: { not: null } },
      orderBy: { featuredOrder: 'asc' },
      select: {
        id: true,
        title: true,
        coverImage: true,
        artist: { select: { name: true } },
        featuredOrder: true,
      },
    }),
  ]);

  return NextResponse.json({
    articles: featuredArticles,
    albums: featuredAlbums,
    max: MAX_FEATURED,
  });
}

/**
 * Body: `{ kind: 'article' | 'album', ids: string[] }`.
 * Order in `ids` = display order. Rows not in `ids` get `featuredOrder =
 * null` (dropped from featured). The whole operation runs in a
 * transaction so we never end up with half-featured state.
 */
export async function PUT(request: NextRequest) {
  const { error } = await requireAuth('EDITOR');
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  }

  const { kind, ids } = body as { kind?: unknown; ids?: unknown };
  if (kind !== 'article' && kind !== 'album') {
    return NextResponse.json({ error: 'kind must be "article" or "album"' }, { status: 400 });
  }
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) {
    return NextResponse.json({ error: 'ids must be a string array' }, { status: 400 });
  }
  if (ids.length > MAX_FEATURED) {
    return NextResponse.json(
      { error: `En fazla ${MAX_FEATURED} öğe öne çıkarabilirsin.` },
      { status: 400 },
    );
  }

  const uniqueIds = Array.from(new Set(ids));

  if (kind === 'article') {
    await prisma.$transaction([
      // Clear every existing featured article first.
      prisma.article.updateMany({
        where: { featuredOrder: { not: null } },
        data: { featuredOrder: null },
      }),
      // Then assign the new order. We run this as N single-row updates
      // (rather than one updateMany) because each row needs a different
      // order value.
      ...uniqueIds.map((id, i) =>
        prisma.article.update({ where: { id }, data: { featuredOrder: i } }),
      ),
    ]);
    revalidateTag(CACHE_TAGS.article, 'max');
  } else {
    await prisma.$transaction([
      prisma.album.updateMany({
        where: { featuredOrder: { not: null } },
        data: { featuredOrder: null },
      }),
      ...uniqueIds.map((id, i) =>
        prisma.album.update({ where: { id }, data: { featuredOrder: i } }),
      ),
    ]);
    revalidateTag(CACHE_TAGS.album, 'max');
  }

  return NextResponse.json({ success: true, count: uniqueIds.length });
}
