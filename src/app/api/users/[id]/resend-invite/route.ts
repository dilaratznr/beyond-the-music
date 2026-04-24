import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import {
  createInvitation,
  buildInviteUrl,
  sendInviteEmail,
} from '@/lib/user-invitations';

/**
 * POST /api/users/[id]/resend-invite
 *   Super Admin, bir kullanıcıya (yeni veya aktif) yeni bir davet /
 *   şifre belirleme linki gönderir. Davet, kullanıcının tüm eski açık
 *   davetlerini iptal eder. Şifresi daha önce set edilmiş bir kullanıcı
 *   için de çalışır — bu durumda pratikte bir "super admin tarafından
 *   tetiklenen password reset" akışı gibi davranır: kullanıcı yeni
 *   linkle şifresini değiştirir, mustSetPassword=false olmaya devam eder
 *   (davet aslında şifreyi yazar, mustSetPassword false kalır).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user: actor } = await requireAuth('SUPER_ADMIN');
  if (error || !actor) return error;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, isActive: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
  }
  if (!user.isActive) {
    return NextResponse.json(
      { error: 'Pasif kullanıcıya davet gönderilemez' },
      { status: 400 },
    );
  }

  const { rawToken, expiresAt } = await createInvitation({
    userId: user.id,
    invitedById: actor.id,
  });

  const origin = request.headers.get('origin') || undefined;
  const inviteUrl = buildInviteUrl(rawToken, origin);

  const { emailSent, error: emailError } = await sendInviteEmail({
    to: user.email,
    recipientName: user.name,
    inviteUrl,
    invitedByName: actor.name || 'Super Admin',
  });

  return NextResponse.json({
    invite: {
      url: inviteUrl,
      expiresAt,
      emailSent,
      emailError: emailSent ? undefined : emailError,
    },
  });
}
