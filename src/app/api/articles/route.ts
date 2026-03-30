import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { slugify } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const category = searchParams.get('category');
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where, include: { author: { select: { name: true } }, relatedGenre: { select: { nameTr: true, nameEn: true, slug: true } }, relatedArtist: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSectionAccess('ARTICLE', 'canCreate');
  if (error || !user) return error;

  const body = await request.json();
  const { titleTr, titleEn, contentTr, contentEn, category, featuredImage, status, relatedGenreId, relatedArtistId } = body;

  if (!titleTr || !titleEn || !category) return NextResponse.json({ error: 'Title (TR/EN) and category are required' }, { status: 400 });

  const slug = slugify(titleEn);
  const article = await prisma.article.create({
    data: {
      slug, titleTr, titleEn, contentTr: contentTr || null, contentEn: contentEn || null, category,
      featuredImage: featuredImage || null, authorId: user.id, status: status || 'DRAFT',
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      relatedGenreId: relatedGenreId || null, relatedArtistId: relatedArtistId || null,
    },
  });

  return NextResponse.json(article, { status: 201 });
}
