import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const type = searchParams.get('type');
  const all = searchParams.get('all') === 'true';

  const where: Record<string, unknown> = {};
  if (type) where.type = type;

  if (all) {
    const artists = await prisma.artist.findMany({
      where, include: { genres: { include: { genre: true } }, _count: { select: { albums: true, articles: true } } }, orderBy: { name: 'asc' },
    });
    return NextResponse.json(artists);
  }

  const [items, total] = await Promise.all([
    prisma.artist.findMany({
      where, include: { genres: { include: { genre: true } }, _count: { select: { albums: true, articles: true } } },
      orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit,
    }),
    prisma.artist.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error } = await requireSectionAccess('ARTIST', 'canCreate');
  if (error) return error;

  const body = await request.json();
  const { name, type, bioTr, bioEn, image, birthDate, deathDate, genreIds } = body;

  if (!name || !type) return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });

  const slug = slugify(name);
  const artist = await prisma.artist.create({
    data: {
      slug, name, type, bioTr: bioTr || null, bioEn: bioEn || null, image: image || null,
      birthDate: birthDate ? new Date(birthDate) : null, deathDate: deathDate ? new Date(deathDate) : null,
      genres: genreIds?.length ? { create: genreIds.map((genreId: string) => ({ genreId })) } : undefined,
    },
  });

  revalidateTag(CACHE_TAGS.artist, 'max');
  return NextResponse.json(artist, { status: 201 });
}
