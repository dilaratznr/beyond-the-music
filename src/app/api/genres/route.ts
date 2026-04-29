import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess, isAdminRequest } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { resolveCreateStatus, maybeCreateReviewOnCreate } from '@/lib/content-review';
import { publicApiRateLimit } from '@/lib/rate-limit';
import { audit, extractContext } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
  const limited = await publicApiRateLimit(request, 'genres');
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 100);
  const all = searchParams.get('all') === 'true';

  // Anonymous → PUBLISHED only; admin → all (admin/genres list page uses
  // ?all=true and needs to see drafts).
  const isAdmin = await isAdminRequest();
  const statusWhere = isAdmin ? {} : { status: 'PUBLISHED' as const };

  if (all) {
    const genres = await prisma.genre.findMany({
      where: statusWhere,
      include: { children: true, _count: { select: { artists: true, articles: true } } },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(genres);
  }

  const [items, total] = await Promise.all([
    prisma.genre.findMany({
      where: statusWhere,
      include: { children: true, _count: { select: { artists: true, articles: true } } },
      orderBy: { order: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.genre.count({ where: statusWhere }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSectionAccess('GENRE', 'canCreate');
  if (error || !user) return error;

  const body = await request.json();
  const { nameTr, nameEn, descriptionTr, descriptionEn, image, parentId, order } = body;

  if (!nameTr || !nameEn) {
    return NextResponse.json({ error: 'Name (TR and EN) is required' }, { status: 400 });
  }

  const { status, requiresReview } = await resolveCreateStatus({
    section: 'GENRE',
    userId: user.id,
  });

  const slug = slugify(nameEn);

  const genre = await prisma.genre.create({
    data: {
      slug, nameTr, nameEn,
      descriptionTr: descriptionTr || null,
      descriptionEn: descriptionEn || null,
      image: image || null,
      parentId: parentId || null,
      order: order || 0,
      status,
    },
  });

  await maybeCreateReviewOnCreate({
    section: 'GENRE',
    entityId: genre.id,
    entityTitle: genre.nameTr,
    userId: user.id,
    status,
  });

  const ctx = extractContext(request);
  await audit({
    event: 'GENRE_CREATED',
    actorId: user.id,
    targetId: genre.id,
    targetType: 'GENRE',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    detail: genre.nameTr,
  });

  revalidateTag(CACHE_TAGS.genre, 'max');
  return NextResponse.json({ ...genre, requiresReview }, { status: 201 });
}
