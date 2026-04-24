import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';

/**
 * GET /api/admin/reviews
 *   Onay kuyruğundaki içeriklerin listesi. Super Admin only.
 *
 *   Query param:
 *     ?status=PENDING | APPROVED | REJECTED   (default: PENDING)
 *     ?limit=20                                 (default: 50)
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | null) || 'PENDING';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

  const reviews = await prisma.contentReview.findMany({
    where: { status },
    orderBy: { submittedAt: 'desc' },
    take: limit,
    include: {
      submittedBy: { select: { id: true, name: true, email: true, role: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(reviews);
}
