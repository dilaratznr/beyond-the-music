import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { approveReview } from '@/lib/content-review';
import { audit, extractContext } from '@/lib/audit-log';

/**
 * POST /api/admin/reviews/[id]/approve
 *   Bekleyen bir review'i onayla. Super Admin only.
 *
 *   Her section için transition aynı:
 *     - Entity status → PUBLISHED (Article için publishedAt da set edilir)
 *     - Review status → APPROVED
 *   Entity DB'de yoksa (silinmişse) warn log + 404 döner.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await requireAuth('SUPER_ADMIN');
  if (error || !user) return error;

  const { id } = await params;

  const review = await prisma.contentReview.findUnique({ where: { id } });
  if (!review) {
    return NextResponse.json({ error: 'Review bulunamadı' }, { status: 404 });
  }
  if (review.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'Bu review zaten sonuçlanmış' },
      { status: 400 },
    );
  }

  // Section'a göre gerçek içeriğin yayın durumunu güncelle. Her bir
  // içerik modelinin ayrı Prisma delegate'i var — ortak bir "update
  // status" helper'ı yazmak tip güvenliği kaybına yol açıyordu, bu
  // yüzden switch net duruyor.
  switch (review.section) {
    case 'ARTICLE': {
      const article = await prisma.article.findUnique({
        where: { id: review.entityId },
        select: { id: true, status: true, publishedAt: true },
      });
      if (!article) {
        console.warn(
          `[reviews/approve] Review ${review.id}: makale ${review.entityId} bulunamadı, silinmiş olabilir`,
        );
        return NextResponse.json(
          { error: 'İlgili makale artık mevcut değil' },
          { status: 404 },
        );
      }
      // Schedule preservation: yazar review'a göndermeden önce ileri tarihli
      // bir publishedAt set ettiyse, super-admin onayı bu zamanlamayı
      // bozmamalı. publishedAt gelecekte ise statüsü SCHEDULED kalır;
      // publishDueArticles() (cron + admin sayfa load'larında çağrılan)
      // zaman gelince PUBLISHED'e çevirir. Geçmiş tarihli veya boşsa
      // anında yayına alınır (publishedAt = now).
      const now = new Date();
      const isScheduled =
        article.publishedAt !== null && article.publishedAt > now;
      await prisma.article.update({
        where: { id: article.id },
        data: isScheduled
          ? { status: 'SCHEDULED' }
          : { status: 'PUBLISHED', publishedAt: article.publishedAt ?? now },
      });
      revalidateTag(CACHE_TAGS.article, 'max');
      break;
    }
    case 'ARTIST': {
      const exists = await prisma.artist.findUnique({ where: { id: review.entityId }, select: { id: true } });
      if (!exists) return orphanResponse('sanatçı', review.id, review.entityId);
      await prisma.artist.update({ where: { id: exists.id }, data: { status: 'PUBLISHED' } });
      revalidateTag(CACHE_TAGS.artist, 'max');
      break;
    }
    case 'ALBUM': {
      const exists = await prisma.album.findUnique({ where: { id: review.entityId }, select: { id: true } });
      if (!exists) return orphanResponse('albüm', review.id, review.entityId);
      await prisma.album.update({ where: { id: exists.id }, data: { status: 'PUBLISHED' } });
      revalidateTag(CACHE_TAGS.album, 'max');
      break;
    }
    case 'ARCHITECT': {
      const exists = await prisma.architect.findUnique({ where: { id: review.entityId }, select: { id: true } });
      if (!exists) return orphanResponse('mimar', review.id, review.entityId);
      await prisma.architect.update({ where: { id: exists.id }, data: { status: 'PUBLISHED' } });
      revalidateTag(CACHE_TAGS.architect, 'max');
      break;
    }
    case 'GENRE': {
      const exists = await prisma.genre.findUnique({ where: { id: review.entityId }, select: { id: true } });
      if (!exists) return orphanResponse('tür', review.id, review.entityId);
      await prisma.genre.update({ where: { id: exists.id }, data: { status: 'PUBLISHED' } });
      revalidateTag(CACHE_TAGS.genre, 'max');
      break;
    }
    case 'LISTENING_PATH': {
      const exists = await prisma.listeningPath.findUnique({ where: { id: review.entityId }, select: { id: true } });
      if (!exists) return orphanResponse('dinleme rotası', review.id, review.entityId);
      await prisma.listeningPath.update({ where: { id: exists.id }, data: { status: 'PUBLISHED' } });
      revalidateTag(CACHE_TAGS.listeningPath, 'max');
      break;
    }
    default:
      console.warn(`[reviews/approve] Bilinmeyen section: ${review.section} (review ${review.id})`);
  }

  const updated = await approveReview(review.id, user.id);

  // Audit: yetkili karar — review onaylandı, içerik yayına alındı.
  // Forensic için: hangi Super Admin hangi içeriği yayınladı, ne zaman.
  const ctx = extractContext(request);
  await audit({
    event: 'REVIEW_APPROVED',
    actorId: user.id,
    targetId: review.entityId,
    targetType: review.section,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    detail: `${review.section}: ${review.entityTitle}`,
  });

  return NextResponse.json(updated);
}

function orphanResponse(label: string, reviewId: string, entityId: string) {
  console.warn(
    `[reviews/approve] Review ${reviewId}: ${label} ${entityId} bulunamadı, silinmiş olabilir`,
  );
  return NextResponse.json(
    { error: `İlgili ${label} artık mevcut değil` },
    { status: 404 },
  );
}
