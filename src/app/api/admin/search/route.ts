import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';

/**
 * Admin-only global search. Unlike the public /api/search endpoint this
 * includes DRAFT and SCHEDULED articles, returns admin IDs (so results link
 * straight to edit pages), and does not filter by publish status.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth('EDITOR');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const take = 6;
  const ci = 'insensitive' as const;

  const [artists, albums, songs, articles, architects, genres, paths] = await Promise.all([
    prisma.artist.findMany({
      where: { name: { contains: q, mode: ci } },
      take,
      select: { id: true, name: true, slug: true, type: true, image: true },
      orderBy: { name: 'asc' },
    }),
    prisma.album.findMany({
      where: { OR: [{ title: { contains: q, mode: ci } }, { artist: { name: { contains: q, mode: ci } } }] },
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        artist: { select: { name: true } },
      },
      orderBy: { title: 'asc' },
    }),
    prisma.song.findMany({
      where: { title: { contains: q, mode: ci } },
      take,
      select: {
        id: true,
        title: true,
        album: { select: { id: true, title: true, coverImage: true, artist: { select: { name: true } } } },
      },
      orderBy: { title: 'asc' },
    }),
    prisma.article.findMany({
      where: {
        OR: [
          { titleTr: { contains: q, mode: ci } },
          { titleEn: { contains: q, mode: ci } },
        ],
      },
      take,
      select: { id: true, titleTr: true, featuredImage: true, status: true, category: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.architect.findMany({
      where: { name: { contains: q, mode: ci } },
      take,
      select: { id: true, name: true, slug: true, type: true, image: true },
      orderBy: { name: 'asc' },
    }),
    prisma.genre.findMany({
      where: {
        OR: [{ nameTr: { contains: q, mode: ci } }, { nameEn: { contains: q, mode: ci } }],
      },
      take,
      select: { id: true, nameTr: true, slug: true, image: true },
      orderBy: { nameTr: 'asc' },
    }),
    prisma.listeningPath.findMany({
      where: {
        OR: [{ titleTr: { contains: q, mode: ci } }, { titleEn: { contains: q, mode: ci } }],
      },
      take,
      select: { id: true, titleTr: true, type: true, image: true },
      orderBy: { titleTr: 'asc' },
    }),
  ]);

  // Each hit gets a stable shape the client can render uniformly. `href` is
  // the admin edit route; `sub` is a short contextual hint (artist name,
  // category, etc.).
  const results = [
    ...articles.map((a) => ({
      kind: 'article' as const,
      id: a.id,
      title: a.titleTr,
      image: a.featuredImage,
      sub: `Makale · ${a.category.replace(/_/g, ' ').toLowerCase()} · ${
        a.status === 'PUBLISHED' ? 'yayında' : a.status === 'SCHEDULED' ? 'zamanlanmış' : 'taslak'
      }`,
      href: `/admin/articles/${a.id}`,
    })),
    ...artists.map((a) => ({
      kind: 'artist' as const,
      id: a.id,
      title: a.name,
      image: a.image,
      sub: `Sanatçı · ${a.type.toLowerCase()}`,
      href: `/admin/artists/${a.id}`,
    })),
    ...albums.map((a) => ({
      kind: 'album' as const,
      id: a.id,
      title: a.title,
      image: a.coverImage,
      sub: `Albüm · ${a.artist.name}`,
      href: `/admin/albums/${a.id}`,
    })),
    ...songs.map((s) => ({
      kind: 'song' as const,
      id: s.id,
      title: s.title,
      image: s.album.coverImage,
      sub: `Şarkı · ${s.album.artist.name} — ${s.album.title}`,
      href: `/admin/songs/${s.id}`,
    })),
    ...architects.map((a) => ({
      kind: 'architect' as const,
      id: a.id,
      title: a.name,
      image: a.image,
      sub: `Mimar · ${a.type.replace('_', ' ').toLowerCase()}`,
      href: `/admin/architects/${a.id}`,
    })),
    ...genres.map((g) => ({
      kind: 'genre' as const,
      id: g.id,
      title: g.nameTr,
      image: g.image,
      sub: 'Tür',
      href: `/admin/genres/${g.id}`,
    })),
    ...paths.map((p) => ({
      kind: 'path' as const,
      id: p.id,
      title: p.titleTr,
      image: p.image,
      sub: `Dinleme Rotası · ${p.type.toLowerCase()}`,
      href: `/admin/listening-paths/${p.id}`,
    })),
  ];

  return NextResponse.json({ results, query: q });
}
