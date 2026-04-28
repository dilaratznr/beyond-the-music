import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess, isAdminRequest } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { resolveCreateStatus, maybeCreateReviewOnCreate } from '@/lib/content-review';
import { publicApiRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = publicApiRateLimit(request, 'albums');
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const artistId = searchParams.get('artistId');

  // Anonymous visitors only see PUBLISHED. Admin panel uses the same endpoint
  // for its album list page; auth cookie identifies them and they get all rows.
  const isAdmin = await isAdminRequest();
  const where: Record<string, unknown> = {};
  if (artistId) where.artistId = artistId;
  if (!isAdmin) where.status = 'PUBLISHED';

  const [items, total] = await Promise.all([
    prisma.album.findMany({ where, include: { artist: { select: { name: true, slug: true } }, _count: { select: { songs: true } } }, orderBy: { releaseDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.album.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSectionAccess('ALBUM', 'canCreate');
  if (error || !user) return error;
  const body = await request.json();
  const { title, artistId, releaseDate, coverImage, descriptionTr, descriptionEn } = body;
  if (!title || !artistId) return NextResponse.json({ error: 'Title and artist are required' }, { status: 400 });

  const { status, requiresReview } = await resolveCreateStatus({
    section: 'ALBUM',
    userId: user.id,
  });

  const slug = slugify(title);
  const album = await prisma.album.create({
    data: {
      slug, title, artistId,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      coverImage: coverImage || null,
      descriptionTr: descriptionTr || null,
      descriptionEn: descriptionEn || null,
      status,
    },
  });

  await maybeCreateReviewOnCreate({
    section: 'ALBUM',
    entityId: album.id,
    entityTitle: album.title,
    userId: user.id,
    status,
  });

  revalidateTag(CACHE_TAGS.album, 'max');
  return NextResponse.json({ ...album, requiresReview }, { status: 201 });
}
