import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encode } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { verifyTotpCode, generateBackupCodes } from '@/lib/two-factor';
import { audit, extractContext } from '@/lib/audit-log';
import { rateLimit } from '@/lib/rate-limit';

function getCookieName() {
  const useSecure =
    process.env.NEXTAUTH_URL?.startsWith('https://') ||
    process.env.VERCEL === '1';
  return useSecure
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
}

/**
 * Verify TOTP during 2FA setup. On success: enable 2FA, generate + return
 * backup codes (raw, one-time display). Rate-limited (brute force defense).
 */
export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth('EDITOR');
  if (error || !user) return error;

  const userId = (user as { id: string }).id;
  const ctx = extractContext(request);

  // Brute force defense: rate-limit 5/min makes exhaustive search impractical.
  const rl = rateLimit(`2fa:verify:${userId}`, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Çok fazla yanlış kod. 1 dakika bekleyin.' },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.trim() : '';

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabledAt: true },
  });

  if (!dbUser?.twoFactorSecret) {
    return NextResponse.json(
      { error: 'Önce setup başlatılmalı.' },
      { status: 400 },
    );
  }
  if (dbUser.twoFactorEnabledAt) {
    return NextResponse.json(
      { error: '2FA zaten aktif.' },
      { status: 409 },
    );
  }

  let valid: boolean;
  try {
    valid = verifyTotpCode(dbUser.twoFactorSecret, code);
  } catch {
    return NextResponse.json({ error: 'Geçersiz secret formatı.' }, { status: 500 });
  }

  if (!valid) {
    await audit({
      event: 'TWO_FACTOR_SETUP_FAILED',
      actorId: userId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return NextResponse.json({ error: 'Kod hatalı, tekrar dene.' }, { status: 400 });
  }

  // Backup kodları üret + atomik şekilde DB'ye yaz + 2FA'yı aktif et.
  const { raw, hashes } = generateBackupCodes();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabledAt: new Date() },
    }),
    // Eski backup kodları varsa sil
    prisma.backupCode.deleteMany({ where: { userId } }),
    prisma.backupCode.createMany({
      data: hashes.map((h) => ({ userId, codeHash: h })),
    }),
  ]);

  await audit({
    event: 'TWO_FACTOR_ENABLED',
    actorId: userId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  // Cookie'yi taze JWT ile değiştir — eski cookie `tfaPending: 'enroll'`
  // claim'i taşıyor, middleware o yüzden kullanıcıyı sürekli setup
  // sayfasına atıyor. Setup başarılı olduğuna göre artık tam yetkili
  // session'a geçişi yapıyoruz: tfaPending yok, 24h geçerli.
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    const fullToken = await encode({
      token: {
        sub: userId,
        id: userId,
        email: (user as { email: string }).email,
        name: (user as { name?: string }).name ?? undefined,
        role: (user as { role: string }).role,
      },
      secret,
      maxAge: 24 * 60 * 60,
    });
    const cookieName = getCookieName();
    (await cookies()).set(cookieName, fullToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: cookieName.startsWith('__Secure-'),
      maxAge: 24 * 60 * 60,
    });
  }

  // Raw kodları DÖN — kullanıcı bir kerelik görecek, indirip saklayacak.
  // Bir daha asla bu API'den dönmüyor (DB'de hash'li).
  return NextResponse.json({
    enabled: true,
    backupCodes: raw,
  });
}
