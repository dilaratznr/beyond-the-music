import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess, isAdminRequest } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { resolveCreateStatus, maybeCreateReviewOnCreate } from '@/lib/content-review';
import { publicApiRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = publicApiRateLimit(request, 'artists');
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const type = searchParams.get('type');
  const all = searchParams.get('all') === 'true';

  // Public ↔ admin shared endpoint. Anonymous → PUBLISHED only; admin → all.
  const isAdmin = await isAdminRequest();
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (!isAdmin) where.status = 'PUBLISHED';

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
  const { error, user } = await requireSectionAccess('ARTIST', 'canCreate');
  if (error || !user) return error;

  const body = await request.json();
  const { name, type, bioTr, bioEn, image, birthDate, deathDate, genreIds } = body;

  if (!name || !type) return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });

  // canPublish yetkisi yoksa → PENDING_REVIEW, Super Admin onayı
  // beklenir. Var olan sanatçıların public query'leri `status=PUBLISHED`
  // filtreliyor, yeni kayıt onaylanana kadar public'te gözükmez.
  const { status, requiresReview } = await resolveCreateStatus({
    section: 'ARTIST',
    userId: user.id,
  });

  const slug = slugify(name);
  const artist = await prisma.artist.create({
    data: {
      slug, name, type, bioTr: bioTr || null, bioEn: bioEn || null, image: image || null,
      birthDate: birthDate ? new Date(birthDate) : null, deathDate: deathDate ? new Date(deathDate) : null,
      status,
      genres: genreIds?.length ? { create: genreIds.map((genreId: string) => ({ genreId })) } : undefined,
    },
  });

  await maybeCreateReviewOnCreate({
    section: 'ARTIST',
    entityId: artist.id,
    entityTitle: artist.name,
    userId: user.id,
    status,
  });

  revalidateTag(CACHE_TAGS.artist, 'max');
  return NextResponse.json({ ...artist, requiresReview }, { status: 201 });
}
