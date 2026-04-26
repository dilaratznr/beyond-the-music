import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { audit, extractContext } from '@/lib/audit-log';

/**
 * Super Admin recovery: disable another user's 2FA (lost phone/backup codes).
 * User re-enrolls on next login. Strictly audited (breach response).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user: actor } = await requireAuth('SUPER_ADMIN');
  if (error || !actor) return error;

  const ctx = extractContext(request);
  const { id } = await params;

  // Don't allow self-disable; use /admin/security/2fa with TOTP verification instead.
  if ((actor as { id: string }).id === id) {
    return NextResponse.json(
      { error: 'Kendi 2FA\'nızı bu yoldan kapatamazsınız. Setup sayfasını kullanın.' },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, twoFactorEnabledAt: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        twoFactorSecret: null,
        twoFactorEnabledAt: null,
      },
    }),
    prisma.backupCode.deleteMany({ where: { userId: id } }),
  ]);

  await audit({
    event: 'TWO_FACTOR_DISABLED_BY_ADMIN',
    actorId: (actor as { id: string }).id,
    targetId: id,
    targetType: 'USER',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    detail: `target=${target.email}`,
  });

  return NextResponse.json({ success: true });
}
