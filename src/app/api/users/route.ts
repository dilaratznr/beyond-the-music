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
import { sanitizePermissionsInput } from '@/lib/permissions';
import { isValidUsername } from '@/lib/user-lookup';
import { audit, extractContext } from '@/lib/audit-log';

const VALID_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);

export async function GET() {
  const { error, user } = await requireAuth('ADMIN');
  if (error) return error;

  // Admins can see users, but only super admin sees all
  const where = user!.role === 'SUPER_ADMIN' ? {} : { role: 'EDITOR' as const };

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      permissions: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

/**
 * POST /api/users
 *   Super Admin yeni kullanıcı oluşturur. Username zorunlu, email opsiyonel.
 *   Şifre belirleme akışı kullanıcıya bırakılır (davet linki).
 */
export async function POST(request: NextRequest) {
  const { error, user: actor } = await requireAuth('SUPER_ADMIN');
  if (error || !actor) return error;

  const body = await request.json();
  const rawUsername = typeof body.username === 'string' ? body.username : '';
  const rawEmail = typeof body.email === 'string' ? body.email : '';
  const { name, role, permissions } = body;

  // Username normalize: trim + lowercase. Schema'da unique key bu formda.
  const username = rawUsername.trim().toLowerCase();
  // Email opsiyonel: boş string null'a düşer.
  const email = rawEmail.trim().toLowerCase() || null;

  if (!username || !name || !role) {
    return NextResponse.json(
      { error: 'Kullanıcı adı, ad ve rol zorunludur' },
      { status: 400 },
    );
  }
  if (!isValidUsername(username)) {
    return NextResponse.json(
      {
        error:
          'Geçersiz kullanıcı adı. Format: 3-30 karakter, küçük harf + rakam + alt çizgi/tire.',
      },
      { status: 400 },
    );
  }
  if (!VALID_ROLES.has(role)) {
    return NextResponse.json({ error: 'Geçersiz rol' }, { status: 400 });
  }
  // Email opsiyonel ama verildiyse format kontrolü
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta gir' }, { status: 400 });
  }

  // Permissions sanitize — section whitelist + strict boolean
  const permsResult = sanitizePermissionsInput(permissions);
  if (!permsResult.ok) {
    return NextResponse.json({ error: permsResult.error }, { status: 400 });
  }
  const safePermissions = permsResult.sanitized;

  // Username + email collision kontrolü (tek query'de OR)
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, ...(email ? [{ email }] : [])] },
    select: { username: true, email: true },
  });
  if (existing) {
    if (existing.username === username) {
      return NextResponse.json(
        { error: 'Bu kullanıcı adı zaten kullanılıyor' },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Bu e-posta zaten kayıtlı' }, { status: 400 });
  }

  // Placeholder şifre — login bloke (mustSetPassword=true). Davet
  // tamamlanınca üzerine yazılır.
  const randomPw = crypto.randomBytes(32).toString('base64url');
  const placeholderHash = await bcrypt.hash(randomPw, 12);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: placeholderHash,
      name,
      role,
      mustSetPassword: true,
      permissions: safePermissions.length ? {
        create: safePermissions.map((p) => ({
          section: p.section,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          canPublish: p.canPublish,
        })),
      } : undefined,
    },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      mustSetPassword: true,
      permissions: true,
    },
  });

  // Davet token'ı + opsiyonel email
  const { rawToken, expiresAt } = await createInvitation({
    userId: user.id,
    invitedById: actor.id,
  });

  const origin = request.headers.get('origin') || undefined;
  const inviteUrl = buildInviteUrl(rawToken, origin);

  // Email yoksa SMTP'yi denemenin anlamı yok — direkt manuel paylaşım modu.
  let emailSent = false;
  let emailError: string | undefined;
  if (user.email) {
    const result = await sendInviteEmail({
      to: user.email,
      recipientName: user.name,
      inviteUrl,
      invitedByName: actor.name || 'Super Admin',
    });
    emailSent = result.emailSent;
    emailError = result.error;
  }

  // Audit: yeni kullanıcı oluşturuldu. Davet edilen kullanıcı + rol +
  // email gönderim durumu. Forensic için kritik — kim kimin için davet
  // oluşturdu, hangi yetkilerle.
  const ctx = extractContext(request);
  await audit({
    event: 'USER_CREATED',
    actorId: actor.id,
    targetId: user.id,
    targetType: 'USER',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    detail: `${user.username} (${user.role})${emailSent ? ' · invite emailed' : ''}`,
  });

  revalidateTag(CACHE_TAGS.user, 'max');
  return NextResponse.json(
    {
      user,
      invite: {
        url: inviteUrl,
        expiresAt,
        emailSent,
        // Email yoksa veya gönderilemediyse UI URL'i manuel paylaşım için gösterir
        emailError: emailSent ? undefined : emailError,
      },
    },
    { status: 201 },
  );
}
