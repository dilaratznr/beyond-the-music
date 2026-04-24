import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { publishDueArticles } from '@/lib/article-publishing';
import { parseScheduledFor } from '@/lib/datetime-local';
import { canUserPublish, submitForReview } from '@/lib/content-review';

export async function GET(request: NextRequest) {
  // Promote any scheduled articles whose time has come before reading the list —
  // keeps the admin badges in sync without a background worker.
  await publishDueArticles();

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
      where,
      include: {
        author: { select: { name: true } },
        relatedGenre: { select: { nameTr: true, nameEn: true, slug: true } },
        relatedArtist: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSectionAccess('ARTICLE', 'canCreate');
  if (error || !user) return error;

  const body = await request.json();
  const {
    titleTr,
    titleEn,
    contentTr,
    contentEn,
    category,
    featuredImage,
    status,
    scheduledFor,
    relatedGenreId,
    relatedArtistId,
  } = body;

  if (!titleTr || !titleEn || !category) {
    return NextResponse.json(
      { error: 'Title (TR/EN) and category are required' },
      { status: 400 },
    );
  }

  // Normalise the status/publishedAt pair:
  //   DRAFT           → publishedAt = null
  //   SCHEDULED       → publishedAt = future date (required); if in the past, publish now
  //   PUBLISHED       → publishedAt = now
  //   PENDING_REVIEW  → canPublish olmayan kullanıcı "yayınla/zamanla" istediğinde;
  //                     içerik Super Admin onayına düşer, publishedAt boş.
  let resolvedStatus: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'PENDING_REVIEW' = 'DRAFT';
  let resolvedPublishedAt: Date | null = null;
  let needsReview = false;

  const canPublish = await canUserPublish(user.id, 'ARTICLE');

  if (status === 'PUBLISHED') {
    if (canPublish) {
      resolvedStatus = 'PUBLISHED';
      resolvedPublishedAt = new Date();
    } else {
      resolvedStatus = 'PENDING_REVIEW';
      needsReview = true;
    }
  } else if (status === 'SCHEDULED') {
    const when = parseScheduledFor(scheduledFor);
    if (!when) {
      return NextResponse.json(
        { error: 'Zamanlanmış yayın için geçerli bir tarih seçmelisin.' },
        { status: 400 },
      );
    }
    if (canPublish) {
      if (when.getTime() <= Date.now()) {
        resolvedStatus = 'PUBLISHED';
        resolvedPublishedAt = new Date();
      } else {
        resolvedStatus = 'SCHEDULED';
        resolvedPublishedAt = when;
      }
    } else {
      // canPublish yoksa zamanlanmış yayın da onay gerektirir
      resolvedStatus = 'PENDING_REVIEW';
      needsReview = true;
    }
  } else if (status === 'PENDING_REVIEW') {
    // Admin açıkça "Onaya Gönder" demiş
    resolvedStatus = 'PENDING_REVIEW';
    needsReview = true;
  }

  const slug = slugify(titleEn);
  const article = await prisma.article.create({
    data: {
      slug,
      titleTr,
      titleEn,
      contentTr: contentTr || null,
      contentEn: contentEn || null,
      category,
      featuredImage: featuredImage || null,
      authorId: user.id,
      status: resolvedStatus,
      publishedAt: resolvedPublishedAt,
      relatedGenreId: relatedGenreId || null,
      relatedArtistId: relatedArtistId || null,
    },
  });

  if (needsReview) {
    await submitForReview({
      section: 'ARTICLE',
      entityId: article.id,
      entityTitle: article.titleTr || article.titleEn,
      changeType: 'CREATE',
      submittedById: user.id,
    });
  }

  revalidateTag(CACHE_TAGS.article, 'max');
  return NextResponse.json(article, { status: 201 });
}
