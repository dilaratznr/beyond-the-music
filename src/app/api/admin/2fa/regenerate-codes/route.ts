import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { generateBackupCodes, verifyTotpCode } from '@/lib/two-factor';
import { audit, extractContext } from '@/lib/audit-log';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Regenerate backup codes. Requires valid TOTP (proof of possession).
 * Clears old codes, generates 10 new ones. Safe if backup codes leaked.
 */
export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth('EDITOR');
  if (error || !user) return error;

  const userId = (user as { id: string }).id;
  const ctx = extractContext(request);

  // Rate limit (TOTP verification provides baseline defense).
  const rl = rateLimit(`2fa:regen:${userId}`, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: 'Çok fazla deneme.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.trim() : '';

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabledAt: true },
  });

  if (!dbUser?.twoFactorSecret || !dbUser.twoFactorEnabledAt) {
    return NextResponse.json(
      { error: '2FA aktif değil.' },
      { status: 400 },
    );
  }

  if (!verifyTotpCode(dbUser.twoFactorSecret, code)) {
    await audit({
      event: 'TWO_FACTOR_REGEN_FAILED',
      actorId: userId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return NextResponse.json({ error: 'Kod hatalı.' }, { status: 400 });
  }

  const { raw, hashes } = generateBackupCodes();

  await prisma.$transaction([
    prisma.backupCode.deleteMany({ where: { userId } }),
    prisma.backupCode.createMany({
      data: hashes.map((h) => ({ userId, codeHash: h })),
    }),
  ]);

  await audit({
    event: 'TWO_FACTOR_BACKUP_CODES_REGENERATED',
    actorId: userId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json({ backupCodes: raw });
}
