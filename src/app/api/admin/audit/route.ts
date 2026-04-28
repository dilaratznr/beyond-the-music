import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';

/**
 * GET /api/admin/audit — Audit log listesi (Super Admin only).
 *
 * Query: ?page=1, ?limit=50 (max 200), ?event=LOGIN_FAILURE, ?actorId=...
 * Response: { items, total, page, totalPages }
 *
 * Filtering: event tam string match, actorId tam id match. PII koruması:
 * `ipHash` zaten hash'li (SHA-256), userAgent kısaltılmış (max 500 char).
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get('limit') || '50', 10)),
  );
  const event = searchParams.get('event')?.trim() || undefined;
  const actorId = searchParams.get('actorId')?.trim() || undefined;

  const where: Record<string, unknown> = {};
  if (event) where.event = event;
  if (actorId) where.actorId = actorId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  try {
    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actor: { select: { id: true, username: true, name: true, email: true } },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch {
    // AuditLog tablosu henüz migrate edilmemişse boş liste dön
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 });
  }
}
