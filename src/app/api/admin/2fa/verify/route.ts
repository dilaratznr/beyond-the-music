import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { verifyTotpCode, generateBackupCodes } from '@/lib/two-factor';
import { audit, extractContext } from '@/lib/audit-log';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/admin/2fa/verify
 *
 * Body: { code: "123456" }
 *
 * Setup sırasında kullanıcının ilk TOTP kodunu doğrular. Başarılıysa:
 *   - twoFactorEnabledAt = now()  → 2FA aktif
 *   - 10 yeni backup kodu oluştur → DB'ye hash'li yaz
 *   - Kullanıcıya raw kodları DÖN (TEK SEFER, asla bir daha gösterilmez)
 *
 * Başarısızsa rate-limit artar (kod brute force koruması).
 */
export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth('EDITOR');
  if (error || !user) return error;

  const userId = (user as { id: string }).id;
  const ctx = extractContext(request);

  // Brute force koruması — TOTP 6 hane = 10^6 kombinasyon. Window=±1
  // ile başarı şansı 3/10^6 ama saniyede 1000 deneme = 6 dakikada
  // çatlar. Dakikada 5 ile bunu pratikte imkansızlaştırıyoruz.
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

  // Raw kodları DÖN — kullanıcı bir kerelik görecek, indirip saklayacak.
  // Bir daha asla bu API'den dönmüyor (DB'de hash'li).
  return NextResponse.json({
    enabled: true,
    backupCodes: raw,
  });
}
