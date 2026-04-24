import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { resolveCreateStatus, maybeCreateReviewOnCreate } from '@/lib/content-review';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const type = searchParams.get('type');

  const where: Record<string, unknown> = {};
  if (type) where.type = type;

  const [items, total] = await Promise.all([
    prisma.architect.findMany({ where, include: { _count: { select: { artists: true } } }, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.architect.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSectionAccess('ARCHITECT', 'canCreate');
  if (error || !user) return error;
  const body = await request.json();
  const { name, type, bioTr, bioEn, image } = body;
  if (!name || !type) return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });

  const { status, requiresReview } = await resolveCreateStatus({
    section: 'ARCHITECT',
    userId: user.id,
  });

  const slug = slugify(name);
  const architect = await prisma.architect.create({
    data: { slug, name, type, bioTr: bioTr || null, bioEn: bioEn || null, image: image || null, status },
  });

  await maybeCreateReviewOnCreate({
    section: 'ARCHITECT',
    entityId: architect.id,
    entityTitle: architect.name,
    userId: user.id,
    status,
  });

  revalidateTag(CACHE_TAGS.architect, 'max');
  return NextResponse.json({ ...architect, requiresReview }, { status: 201 });
}
