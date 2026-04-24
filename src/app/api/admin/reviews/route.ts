import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';

/**
 * GET /api/admin/reviews
 *   Onay kuyruğundaki içeriklerin sayfalanmış listesi. Super Admin only.
 *
 *   Query params:
 *     ?status=PENDING | APPROVED | REJECTED   (default: PENDING)
 *     ?page=1                                   (default: 1)
 *     ?limit=20                                 (default: 15, max: 100)
 *
 *   Response:
 *     { items: Review[], total, page, totalPages }
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | null) || 'PENDING';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '15')), 100);

  // db:push henüz çalışmadıysa contentReview tablosu DB'de yok;
  // panel komple kırılmasın diye sessizce boş dizi dönüyoruz.
  try {
    const [items, total] = await Promise.all([
      prisma.contentReview.findMany({
        where: { status },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          submittedBy: { select: { id: true, name: true, email: true, role: true } },
          reviewedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.contentReview.count({ where: { status } }),
    ]);
    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.warn('[reviews] fetch hatası — migration yapıldı mı?', err);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}
