import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess, isAdminRequest } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { resolveCreateStatus, maybeCreateReviewOnCreate } from '@/lib/content-review';
import { publicApiRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = publicApiRateLimit(request, 'listening-paths');
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // Public ↔ admin shared. Anonymous never sees DRAFT/PENDING_REVIEW paths.
  const isAdmin = await isAdminRequest();
  const where = isAdmin ? {} : { status: 'PUBLISHED' as const };

  const [items, total] = await Promise.all([
    prisma.listeningPath.findMany({ where, include: { _count: { select: { items: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.listeningPath.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSectionAccess('LISTENING_PATH', 'canCreate');
  if (error || !user) return error;
  const body = await request.json();
  const { titleTr, titleEn, descriptionTr, descriptionEn, type, image } = body;
  if (!titleTr || !titleEn || !type) return NextResponse.json({ error: 'Title (TR/EN) and type are required' }, { status: 400 });

  const { status, requiresReview } = await resolveCreateStatus({
    section: 'LISTENING_PATH',
    userId: user.id,
  });

  const slug = slugify(titleEn);
  const path = await prisma.listeningPath.create({
    data: {
      slug, titleTr, titleEn,
      descriptionTr: descriptionTr || null,
      descriptionEn: descriptionEn || null,
      type,
      image: image || null,
      status,
    },
  });

  await maybeCreateReviewOnCreate({
    section: 'LISTENING_PATH',
    entityId: path.id,
    entityTitle: path.titleTr,
    userId: user.id,
    status,
  });

  revalidateTag(CACHE_TAGS.listeningPath, 'max');
  return NextResponse.json({ ...path, requiresReview }, { status: 201 });
}
