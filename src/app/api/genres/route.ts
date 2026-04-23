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
  const all = searchParams.get('all') === 'true';

  if (all) {
    const genres = await prisma.genre.findMany({
      include: { children: true, _count: { select: { artists: true, articles: true } } },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(genres);
  }

  const [items, total] = await Promise.all([
    prisma.genre.findMany({
      include: { children: true, _count: { select: { artists: true, articles: true } } },
      orderBy: { order: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.genre.count(),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error } = await requireSectionAccess('GENRE', 'canCreate');
  if (error) return error;

  const body = await request.json();
  const { nameTr, nameEn, descriptionTr, descriptionEn, image, parentId, order } = body;

  if (!nameTr || !nameEn) {
    return NextResponse.json({ error: 'Name (TR and EN) is required' }, { status: 400 });
  }

  const slug = slugify(nameEn);

  const genre = await prisma.genre.create({
    data: { slug, nameTr, nameEn, descriptionTr: descriptionTr || null, descriptionEn: descriptionEn || null, image: image || null, parentId: parentId || null, order: order || 0 },
  });

  revalidateTag(CACHE_TAGS.genre, 'max');
  return NextResponse.json(genre, { status: 201 });
}
