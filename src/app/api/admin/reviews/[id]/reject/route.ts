import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { rejectReview } from '@/lib/content-review';

/**
 * POST /api/admin/reviews/[id]/reject
 *   Bekleyen bir review'i reddet. Super Admin only.
 *   Body: { note?: string } — admin'e geri bildirim olarak gösterilir.
 *
 *   Article için:
 *     - İçerik status'u → DRAFT (admin düzenleyip tekrar gönderebilir)
 *     - publishedAt → null
 *     - Review status'u → REJECTED (+ not)
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

  if (review.section === 'ARTICLE') {
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
    }
    // Makale silinmişse sessizce review'i kapat, hata verme
  }

  const updated = await rejectReview(review.id, user.id, note);
  return NextResponse.json(updated);
}
