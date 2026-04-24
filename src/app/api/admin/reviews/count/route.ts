import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { countPendingReviews } from '@/lib/content-review';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/reviews/count?status=PENDING
 *
 * Sadece sayı döndürür; sidebar badge ve dashboard widget'ının kullanımı
 * için hafif. Liste endpoint'iyle karıştırma — orası sayfalama ile veri
 * getiriyor, bu yalnızca `{ count: number }`.
 *
 * Super Admin only. Migration yapılmamışsa sessizce `{ count: 0 }` döner.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | null) || 'PENDING';

  // PENDING için optimize helper kullan — try/catch içinde
  if (status === 'PENDING') {
    const count = await countPendingReviews();
    return NextResponse.json({ count });
  }

  // Diğer statüler için generik count
  try {
    const count = await prisma.contentReview.count({ where: { status } });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
