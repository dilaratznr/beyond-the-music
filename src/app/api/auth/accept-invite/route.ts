import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { verifyInvitationToken } from '@/lib/user-invitations';
import { validatePassword } from '@/lib/password-policy';
import { audit, extractContext } from '@/lib/audit-log';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * Public davet endpoint'i — token cuid/hash tabanlı olduğu için brute-force
 * pratikte imkansız, ama log gürültüsünü ve kötü niyetli enumerasyon
 * denemelerini sınırlamak için IP başına rate-limit uyguluyoruz.
 * GET (token validasyonu) ve POST (şifre set) için ayrı pencereler.
 */
async function enforceInviteRateLimit(
  request: NextRequest,
  scope: 'lookup' | 'submit',
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  // GET için pencere biraz daha gevşek (sayfa load'da çağrılır, kullanıcı
  // F5 atarsa hemen tetiklenir). POST için sıkı — şifre set bir kez yapılır.
  const limit = scope === 'lookup' ? 20 : 10;
  const result = await rateLimit(`invite:${scope}:${ip}`, limit, 60_000);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Çok fazla deneme, lütfen birazdan tekrar dene.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(result.resetInMs / 1000)),
        },
      },
    );
  }
  return null;
}

/**
 * GET /api/auth/accept-invite?token=xxx
 *   Token'ı doğrula ve hedef kullanıcının ad/email'ini döndür. Public
 *   bir endpoint — davet sayfası "Merhaba X, şifreni belirle" diye
 *   göstersin diye. Token geçersizse 404 döner.
 */
export async function GET(request: NextRequest) {
  const limited = await enforceInviteRateLimit(request, 'lookup');
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') || '';

  const record = await verifyInvitationToken(token);
  if (!record) {
    return NextResponse.json(
      { error: 'Davet linki geçersiz veya süresi dolmuş' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    username: record.user.username,
    email: record.user.email,
    name: record.user.name,
    expiresAt: record.expiresAt,
  });
}

/**
 * POST /api/auth/accept-invite
 *   Body: { token, password }
 *   Token geçerli ise kullanıcının şifresi set edilir, mustSetPassword
 *   false'a çekilir ve davet used olarak işaretlenir. Aynı kullanıcının
 *   diğer açık davetleri de iptal edilir.
 */
export async function POST(request: NextRequest) {
  const limited = await enforceInviteRateLimit(request, 'submit');
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const { token, password } = body as { token?: string; password?: string };

  if (!token) {
    return NextResponse.json({ error: 'Token eksik' }, { status: 400 });
  }

  const record = await verifyInvitationToken(token);
  if (!record) {
    return NextResponse.json(
      { error: 'Davet linki geçersiz veya süresi dolmuş' },
      { status: 400 },
    );
  }

  // Validation token doğrulamadan SONRA — context için kullanıcı bilgisi gerek.
  const pwResult = validatePassword(password, {
    email: record.user.email,
    username: record.user.username,
    name: record.user.name,
  });
  if (!pwResult.ok) {
    return NextResponse.json({ error: pwResult.error }, { status: 400 });
  }

  const hash = await bcrypt.hash(password!, 12);

  // Atomik: şifreyi set et, davet used olsun, diğer açık davetler iptal.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        password: hash,
        mustSetPassword: false,
      },
    }),
    prisma.userInvitation.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.userInvitation.updateMany({
      where: {
        userId: record.userId,
        usedAt: null,
        id: { not: record.id },
      },
      data: { usedAt: new Date() },
    }),
  ]);

  // Audit: davet kabul edildi ve şifre set edildi. actor = kullanıcının
  // kendisi (henüz session yok ama davet token'ı kimliği doğruluyor).
  const ctx = extractContext(request);
  await audit({
    event: 'USER_INVITE_ACCEPTED',
    actorId: record.userId,
    targetId: record.userId,
    targetType: 'USER',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    detail: 'password set via invite',
  });

  return NextResponse.json({ success: true });
}
