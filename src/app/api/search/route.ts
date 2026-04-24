import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const locale = searchParams.get('locale') || 'tr';

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const query = `%${q}%`;

  const [genres, artists, albums, architects, articles, paths] = await Promise.all([
    prisma.genre.findMany({
      where: { status: 'PUBLISHED', OR: [{ nameTr: { contains: q, mode: 'insensitive' } }, { nameEn: { contains: q, mode: 'insensitive' } }] },
      take: 5,
      select: { slug: true, nameTr: true, nameEn: true, image: true, parentId: true },
    }),
    prisma.artist.findMany({
      where: { status: 'PUBLISHED', OR: [{ name: { contains: q, mode: 'insensitive' } }, { bioTr: { contains: q, mode: 'insensitive' } }, { bioEn: { contains: q, mode: 'insensitive' } }] },
      take: 5,
      select: { slug: true, name: true, type: true, image: true },
    }),
    prisma.album.findMany({
      where: { status: 'PUBLISHED', OR: [{ title: { contains: q, mode: 'insensitive' } }] },
      take: 5,
      select: { slug: true, title: true, coverImage: true, artist: { select: { name: true } } },
    }),
    prisma.architect.findMany({
      where: { status: 'PUBLISHED', OR: [{ name: { contains: q, mode: 'insensitive' } }] },
      take: 5,
      select: { slug: true, name: true, type: true, image: true },
    }),
    prisma.article.findMany({
      where: { status: 'PUBLISHED', OR: [{ titleTr: { contains: q, mode: 'insensitive' } }, { titleEn: { contains: q, mode: 'insensitive' } }, { contentTr: { contains: q, mode: 'insensitive' } }, { contentEn: { contains: q, mode: 'insensitive' } }] },
      take: 5,
      select: { slug: true, titleTr: true, titleEn: true, category: true, featuredImage: true },
    }),
    prisma.listeningPath.findMany({
      where: { status: 'PUBLISHED', OR: [{ titleTr: { contains: q, mode: 'insensitive' } }, { titleEn: { contains: q, mode: 'insensitive' } }] },
      take: 3,
      select: { slug: true, titleTr: true, titleEn: true, type: true, image: true },
    }),
  ]);

  const results = [
    ...genres.map((g) => ({ type: 'genre' as const, slug: g.slug, title: locale === 'tr' ? g.nameTr : g.nameEn, image: g.image, sub: g.parentId ? 'Subgenre' : 'Genre' })),
    ...artists.map((a) => ({ type: 'artist' as const, slug: a.slug, title: a.name, image: a.image, sub: a.type })),
    ...albums.map((a) => ({ type: 'album' as const, slug: a.slug, title: a.title, image: a.coverImage, sub: a.artist.name })),
    ...architects.map((a) => ({ type: 'architect' as const, slug: a.slug, title: a.name, image: a.image, sub: a.type.replace('_', ' ') })),
    ...articles.map((a) => ({ type: 'article' as const, slug: a.slug, title: locale === 'tr' ? a.titleTr : a.titleEn, image: a.featuredImage, sub: a.category.replace(/_/g, ' ') })),
    ...paths.map((p) => ({ type: 'listening-path' as const, slug: p.slug, title: locale === 'tr' ? p.titleTr : p.titleEn, image: p.image, sub: p.type })),
  ];

  return NextResponse.json({ results, query: q });
}
