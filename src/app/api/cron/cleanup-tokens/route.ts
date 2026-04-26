import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Periyodik temizlik: süresi geçmiş veya kullanılmış davet ve şifre-reset
 * token'larını kalıcı olarak siler.
 *
 * Neden gerekli: invitation/reset token'larının `usedAt` alanı set
 * olduğunda kayıt artık işlevsiz; ayrıca süresi geçmiş ama kullanılmamış
 * tokenlar da DB'de birikiyor. Otomatik silme olmadan tablolar zamanla
 * şişer ve `findFirst({ where: { tokenHash } })` sorgu performansını
 * yavaş yavaş kötüleştirir.
 *
 * Kim çağırır:
 *   - Production: `vercel.json` → cron, günde bir.
 *   - Local: `curl -H "Authorization: Bearer $CRON_SECRET" \
 *            http://localhost:3000/api/cron/cleanup-tokens`
 *
 * Auth: CRON_SECRET env'ine göre Authorization header doğrulanır.
 * Vercel Cron `Authorization: Bearer <CRON_SECRET>` header'ını
 * otomatik gönderir (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 *
 * Kasıtlı olarak `force-dynamic`: ISR veya cache lobby'sine girmesin,
 * her invokasyonda DB'ye yazsın.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Kullanılmış token'ları kaç gün sonra silelim. 7 gün → debug/audit
// için kısa bir pencere; daha uzun tutmak isterse env'le override edilebilir.
const USED_TOKEN_RETENTION_DAYS = 7;

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // CRON_SECRET set edilmemişse ENDPOINT TAMAMEN KAPALI olur — yanlış
    // konfigürasyonun açık endpoint'e dönüşmesini engellemek için fail-closed.
    return false;
  }
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  // Constant-time karşılaştırma — auth secret'ı timing attack'e açık
  // bırakmamak için. String length'leri farklıysa false döner.
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const usedCutoff = new Date(
    now.getTime() - USED_TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  // İki kriterle sil:
  //   1) expiresAt < now  → süresi geçmiş, kullanılmamış olsa bile geçersiz
  //   2) usedAt < cutoff  → zaten kullanılmış, audit penceresinden çıkmış
  const [invitations, resets] = await Promise.all([
    prisma.userInvitation.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { lt: usedCutoff } }],
      },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { lt: usedCutoff } }],
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    deletedAt: now.toISOString(),
    invitations: invitations.count,
    passwordResets: resets.count,
  });
}
