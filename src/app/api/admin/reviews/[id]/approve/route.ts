import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { approveReview } from '@/lib/content-review';

/**
 * POST /api/admin/reviews/[id]/approve
 *   Bekleyen bir review'i onayla. Super Admin only.
 *
 *   Article için:
 *     - İçerik status'u → PUBLISHED
 *     - publishedAt → şimdi (eğer yoksa)
 *     - Review status'u → APPROVED
 *   Faz 2'de diğer section'lar için de aynı yapı genişletilecek.
 */
export async function POST(
  _request: NextRequest,
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

  // Section'a göre gerçek içeriğin yayın durumunu güncelle.
  if (review.section === 'ARTICLE') {
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
    await prisma.article.update({
      where: { id: article.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: article.publishedAt ?? new Date(),
      },
    });
    revalidateTag(CACHE_TAGS.article, 'max');
  }
  // Faz 2: else if (review.section === 'ARTIST') { ... } vs.

  const updated = await approveReview(review.id, user.id);
  return NextResponse.json(updated);
}
