import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { parseScheduledFor } from '@/lib/datetime-local';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      relatedGenre: { select: { id: true, nameTr: true, nameEn: true, slug: true } },
      relatedArtist: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  return NextResponse.json(article);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('ARTICLE', 'canEdit');
  if (error) return error;

  const { id } = await params;
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

  const data: Record<string, unknown> = {};
  if (titleTr !== undefined) data.titleTr = titleTr;
  if (titleEn !== undefined) {
    data.titleEn = titleEn;
    data.slug = slugify(titleEn);
  }
  if (contentTr !== undefined) data.contentTr = contentTr || null;
  if (contentEn !== undefined) data.contentEn = contentEn || null;
  if (category !== undefined) data.category = category;
  if (featuredImage !== undefined) data.featuredImage = featuredImage || null;
  if (relatedGenreId !== undefined) data.relatedGenreId = relatedGenreId || null;
  if (relatedArtistId !== undefined) data.relatedArtistId = relatedArtistId || null;

  if (status !== undefined) {
    const current = await prisma.article.findUnique({
      where: { id },
      select: { status: true, publishedAt: true },
    });
    if (!current) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    if (status === 'PUBLISHED') {
      data.status = 'PUBLISHED';
      // Preserve original publish date if already published; otherwise stamp now.
      if (current.status !== 'PUBLISHED' || !current.publishedAt) {
        data.publishedAt = new Date();
      }
    } else if (status === 'SCHEDULED') {
      const when = parseScheduledFor(scheduledFor);
      if (!when) {
        return NextResponse.json(
          { error: 'Zamanlanmış yayın için geçerli bir tarih seçmelisin.' },
          { status: 400 },
        );
      }
      if (when.getTime() <= Date.now()) {
        // Scheduled to the past → publish immediately
        data.status = 'PUBLISHED';
        data.publishedAt = new Date();
      } else {
        data.status = 'SCHEDULED';
        data.publishedAt = when;
      }
    } else {
      // DRAFT
      data.status = 'DRAFT';
      data.publishedAt = null;
    }
  }

  const article = await prisma.article.update({ where: { id }, data });
  revalidateTag(CACHE_TAGS.article, 'max');
  return NextResponse.json(article);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSectionAccess('ARTICLE', 'canDelete');
  if (error) return error;

  const { id } = await params;
  await prisma.article.delete({ where: { id } });
  revalidateTag(CACHE_TAGS.article, 'max');
  return NextResponse.json({ success: true });
}
