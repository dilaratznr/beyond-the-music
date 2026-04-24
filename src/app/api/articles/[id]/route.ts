import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireSectionAccess } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { slugify } from '@/lib/utils';
import { parseScheduledFor } from '@/lib/datetime-local';
import { canUserPublish, submitForReview } from '@/lib/content-review';

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

  // Son reddedilen review — editör neden reddedildiğini görsün diye.
  // Yalnızca REJECTED durumundaki en son review'i çekiyoruz; onay
  // gören veya bekleyen review'ler edit sayfasında gösterilmez.
  // Tablo migration'ı yapılmamış DB'de hata atmasın diye try/catch.
  let lastRejection: {
    reviewNote: string | null;
    reviewedAt: Date | null;
    reviewedBy: { name: string } | null;
  } | null = null;
  try {
    const review = await prisma.contentReview.findFirst({
      where: { section: 'ARTICLE', entityId: id, status: 'REJECTED' },
      orderBy: { reviewedAt: 'desc' },
      select: {
        reviewNote: true,
        reviewedAt: true,
        reviewedBy: { select: { name: true } },
      },
    });
    if (review) lastRejection = review;
  } catch {
    // ContentReview tablosu henüz yoksa sessizce atla
  }

  return NextResponse.json({ ...article, lastRejection });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireSectionAccess('ARTICLE', 'canEdit');
  if (error || !user) return error;

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

  // Onay akışı için — canPublish'i olmayan admin yayın değişiklikleri
  // istiyorsa, makale PENDING_REVIEW'a düşer ve yeni bir review
  // kaydı açılır (zaten açık olan güncellenir).
  let needsReview = false;

  if (status !== undefined) {
    const current = await prisma.article.findUnique({
      where: { id },
      select: { status: true, publishedAt: true, titleTr: true, titleEn: true },
    });
    if (!current) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    const canPublish = await canUserPublish(user.id, 'ARTICLE');

    if (status === 'PUBLISHED') {
      if (canPublish) {
        data.status = 'PUBLISHED';
        // Preserve original publish date if already published; otherwise stamp now.
        if (current.status !== 'PUBLISHED' || !current.publishedAt) {
          data.publishedAt = new Date();
        }
      } else {
        // canPublish yoksa — eğer zaten yayındaysa olduğu gibi kalsın,
        // yoksa onaya düşsün. "Yayındaki makalede düzenleme" de canPublish
        // gerektirir (aksi halde admin sessizce canlı içeriği değiştirirdi).
        data.status = 'PENDING_REVIEW';
        data.publishedAt = null;
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
          data.status = 'PUBLISHED';
          data.publishedAt = new Date();
        } else {
          data.status = 'SCHEDULED';
          data.publishedAt = when;
        }
      } else {
        data.status = 'PENDING_REVIEW';
        data.publishedAt = null;
        needsReview = true;
      }
    } else if (status === 'PENDING_REVIEW') {
      data.status = 'PENDING_REVIEW';
      data.publishedAt = null;
      needsReview = true;
    } else {
      // DRAFT
      data.status = 'DRAFT';
      data.publishedAt = null;
    }
  }

  const article = await prisma.article.update({ where: { id }, data });

  if (needsReview) {
    await submitForReview({
      section: 'ARTICLE',
      entityId: article.id,
      // Yeni başlık verildiyse onu kullan, yoksa DB'dekini
      entityTitle: (titleTr as string) || (titleEn as string) || article.titleTr || article.titleEn,
      changeType: 'EDIT',
      submittedById: user.id,
    });
  }

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
