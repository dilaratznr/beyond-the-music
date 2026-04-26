import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { verifyInvitationToken } from '@/lib/user-invitations';
import { validatePassword } from '@/lib/password-policy';

/**
 * GET /api/auth/accept-invite?token=xxx
 *   Token'ı doğrula ve hedef kullanıcının ad/email'ini döndür. Public
 *   bir endpoint — davet sayfası "Merhaba X, şifreni belirle" diye
 *   göstersin diye. Token geçersizse 404 döner.
 */
export async function GET(request: NextRequest) {
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

  return NextResponse.json({ success: true });
}
