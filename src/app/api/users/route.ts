import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import bcrypt from 'bcryptjs';
import {
  createInvitation,
  buildInviteUrl,
  sendInviteEmail,
} from '@/lib/user-invitations';

export async function GET() {
  const { error, user } = await requireAuth('ADMIN');
  if (error) return error;

  // Admins can see users, but only super admin sees all
  const where = user!.role === 'SUPER_ADMIN' ? {} : { role: 'EDITOR' as const };

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      mustSetPassword: true,
      createdAt: true,
      permissions: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

/**
 * POST /api/users
 *   Super Admin yeni kullanıcı oluşturur. Artık şifre istenmiyor:
 *   - Random placeholder şifre hashlenip kaydedilir (login'i bloklar)
 *   - `mustSetPassword=true` ile NextAuth authorize() login'i reddeder
 *   - Davet token'ı üretilir, kullanıcıya email gönderilmeye çalışılır
 *   - Response `invite.url` ile linki açıkça döndürür (SMTP yoksa
 *     veya Super Admin'in manuel göstermek istediği durumlar için)
 */
export async function POST(request: NextRequest) {
  const { error, user: actor } = await requireAuth('SUPER_ADMIN');
  if (error || !actor) return error;

  const body = await request.json();
  const { email, name, role, permissions } = body;

  if (!email || !name || !role) {
    return NextResponse.json(
      { error: 'E-posta, ad ve rol zorunludur' },
      { status: 400 },
    );
  }
  // Basit email format kontrolü
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta gir' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Bu e-posta zaten kayıtlı' }, { status: 400 });
  }

  // Placeholder şifre — kullanıcı login olamaz (mustSetPassword=true),
  // davet kabul edildiğinde gerçek şifreyle üzerine yazılır. Yine de
  // kolay tahmin edilmemesi için güçlü random üretiyoruz.
  const randomPw = crypto.randomBytes(32).toString('base64url');
  const placeholderHash = await bcrypt.hash(randomPw, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: placeholderHash,
      name,
      role,
      mustSetPassword: true,
      permissions: permissions?.length ? {
        create: permissions.map((p: { section: string; canCreate: boolean; canEdit: boolean; canDelete: boolean; canPublish: boolean }) => ({
          section: p.section,
          canCreate: p.canCreate ?? false,
          canEdit: p.canEdit ?? false,
          canDelete: p.canDelete ?? false,
          canPublish: p.canPublish ?? false,
        })),
      } : undefined,
    },
    select: { id: true, email: true, name: true, role: true, mustSetPassword: true, permissions: true },
  });

  // Davet token'ı + email
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

  revalidateTag(CACHE_TAGS.user, 'max');
  return NextResponse.json(
    {
      user,
      invite: {
        url: inviteUrl,
        expiresAt,
        emailSent,
        // SMTP yoksa bu not UI'da gösterilir
        emailError: emailSent ? undefined : emailError,
      },
    },
    { status: 201 },
  );
}
