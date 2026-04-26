import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { audit, extractContext } from '@/lib/audit-log';

/**
 * POST /api/admin/users/[id]/2fa/disable
 *
 * SUPER_ADMIN'in başka bir admin'in 2FA'sını sıfırlamak için kullandığı
 * recovery yolu. Senaryo: kullanıcı hem telefonu hem yedek kodları
 * kaybetti, hesabına tekrar girebilmek için 2FA secret'ı silinmeli.
 *
 * SONRASI: Kullanıcı login olabilir → middleware tfaPending=enroll'a düşürür
 * → setup sayfasına atılır → yeni 2FA kurar. Bir saatlik açık pencere
 * yaratır ama Super Admin denetiminde olduğu için risk kontrol altında.
 *
 * AUDIT: Bu eylem KESİNLİKLE log'a yazılır — breach response'ta "kim
 * 2FA'mı kapattı?" sorusunun cevabı burası.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user: actor } = await requireAuth('SUPER_ADMIN');
  if (error || !actor) return error;

  const ctx = extractContext(request);
  const { id } = await params;

  // Kendi 2FA'nı kapatmana izin verme — bunun için /admin/security/2fa'da
  // kendin TOTP kodunu doğrulayarak sıfırlarsın. Bu endpoint sadece BAŞKA
  // kullanıcıları kapsamak için.
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
