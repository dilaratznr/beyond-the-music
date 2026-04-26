import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { rejectReview } from '@/lib/content-review';

/**
 * Reject pending review. Sets entity to DRAFT (Article: also null publishedAt),
 * review to REJECTED + note. Handles deleted entities (warns, closes review).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await requireAuth('SUPER_ADMIN');
  if (error || !user) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const note: string | undefined = typeof body?.note === 'string' ? body.note : undefined;

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

  switch (review.section) {
    case 'ARTICLE': {
      const article = await prisma.article.findUnique({
        where: { id: review.entityId },
        select: { id: true },
      });
      if (article) {
        await prisma.article.update({
          where: { id: article.id },
          data: { status: 'DRAFT', publishedAt: null },
        });
        revalidateTag(CACHE_TAGS.article, 'max');
      } else {
        warnOrphan('makale', review.id, review.entityId);
      }
      break;
    }
    case 'ARTIST': {
      const exists = await prisma.artist.findUnique({ where: { id: review.entityId }, select: { id: true } });
      if (exists) {
        await prisma.artist.update({ where: { id: exists.id }, data: { status: 'DRAFT' } });
        revalidateTag(CACHE_TAGS.artist, 'max');
      } else warnOrphan('sanatçı', review.id, review.entityId);
      break;
    }
    case 'ALBUM': {
      const exists = await prisma.album.findUnique({ where: { id: review.entityId }, select: { id: true } });
      if (exists) {
        await prisma.album.update({ where: { id: exists.id }, data: { status: 'DRAFT' } });
        revalidateTag(CACHE_TAGS.album, 'max');
      } else warnOrphan('albüm', review.id, review.entityId);
      break;
    }
    case 'ARCHITECT': {
      const exists = await prisma.architect.findUnique({ where: { id: review.entityId }, select: { id: true } });
      if (exists) {
        await prisma.architect.update({ where: { id: exists.id }, data: { status: 'DRAFT' } });
        revalidateTag(CACHE_TAGS.architect, 'max');
      } else warnOrphan('mimar', review.id, review.entityId);
      break;
    }
    case 'GENRE': {
      const exists = await prisma.genre.findUnique({ where: { id: review.entityId }, select: { id: true } });
      if (exists) {
        await prisma.genre.update({ where: { id: exists.id }, data: { status: 'DRAFT' } });
        revalidateTag(CACHE_TAGS.genre, 'max');
      } else warnOrphan('tür', review.id, review.entityId);
      break;
    }
    case 'LISTENING_PATH': {
      const exists = await prisma.listeningPath.findUnique({ where: { id: review.entityId }, select: { id: true } });
      if (exists) {
        await prisma.listeningPath.update({ where: { id: exists.id }, data: { status: 'DRAFT' } });
        revalidateTag(CACHE_TAGS.listeningPath, 'max');
      } else warnOrphan('dinleme rotası', review.id, review.entityId);
      break;
    }
    default:
      console.warn(`[reviews/reject] Bilinmeyen section: ${review.section} (review ${review.id})`);
  }

  const updated = await rejectReview(review.id, user.id, note);
  return NextResponse.json(updated);
}

function warnOrphan(label: string, reviewId: string, entityId: string) {
  console.warn(
    `[reviews/reject] Review ${reviewId}: ${label} ${entityId} bulunamadı, silinmiş olabilir. Review yine de REJECTED olarak kapatılıyor.`,
  );
}
