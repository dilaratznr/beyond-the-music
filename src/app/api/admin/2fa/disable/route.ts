import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { audit, extractContext } from '@/lib/audit-log';
import { verifyTotpCode, hashBackupCode } from '@/lib/two-factor';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/admin/2fa/disable — kendi 2FA'nı kapat.
 *
 * Re-authentication zorunlu: kullanıcı geçerli bir TOTP kodu (veya
 * backup kodu) sağlamak ZORUNDA. Sadece login cookie'siyle 2FA
 * kapatılabilseydi, çalınan / unutulmuş bir oturumla saldırgan
 * hesabın güvenliğini düşürebilirdi.
 *
 * Bu endpoint super-admin'in BAŞKASININ 2FA'sını kapatması içindekinden
 * (`/api/admin/users/[id]/2fa/disable`) farklı; o yol "kayıp telefon"
 * kurtarma için, bu yol "kullanıcı kendi tercihiyle kapatıyor".
 */
export async function POST(request: NextRequest) {
  // Pending state'te bu endpoint çağrılmamalı — önce 2FA login'i bitsin.
  const { error, user } = await requireAuth('EDITOR');
  if (error || !user) return error;

  const ctx = extractContext(request);
  const userId = (user as { id: string }).id;

  // Brute-force koruması — verify endpoint ile aynı pencere.
  const rl = rateLimit(`2fa:disable:${userId}`, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Çok fazla deneme — bir dakika sonra tekrar dene' },
      { status: 429 },
    );
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code) {
    return NextResponse.json(
      { error: 'Doğrulama kodu gerekli' },
      { status: 400 },
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      twoFactorSecret: true,
      twoFactorEnabledAt: true,
    },
  });

  if (!dbUser?.twoFactorSecret || !dbUser.twoFactorEnabledAt) {
    return NextResponse.json(
      { error: '2FA zaten aktif değil' },
      { status: 400 },
    );
  }

  // Kod doğrulama — TOTP (6 hane) veya backup code (8 karakter A-Z2-7)
  let valid = false;
  let usedBackup = false;

  if (/^\d{6}$/.test(code)) {
    valid = verifyTotpCode(dbUser.twoFactorSecret, code);
  } else {
    const codeHash = hashBackupCode(code);
    const backup = await prisma.backupCode.findFirst({
      where: { userId, codeHash, usedAt: null },
    });
    if (backup) {
      // Backup'la 2FA kapatılırken kodu kullanılmış işaretlemeye gerek
      // yok; aşağıda zaten tüm backup kodlar siliniyor. Replay için
      // tek-kullanım garantisi de aynı transaction.
      valid = true;
      usedBackup = true;
    }
  }

  if (!valid) {
    await audit({
      event: 'TWO_FACTOR_DISABLE_FAILURE',
      actorId: userId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return NextResponse.json({ error: 'Geçersiz kod' }, { status: 400 });
  }

  // 2FA secret + tüm backup kodlar tek transaction'da temizlenir.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: null, twoFactorEnabledAt: null },
    }),
    prisma.backupCode.deleteMany({ where: { userId } }),
  ]);

  await audit({
    event: 'TWO_FACTOR_DISABLED',
    actorId: userId,
    targetId: userId,
    targetType: 'USER',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    detail: usedBackup ? 'verified=backup_code' : 'verified=totp',
  });

  return NextResponse.json({ success: true });
}
