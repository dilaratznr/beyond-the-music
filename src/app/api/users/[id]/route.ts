import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';
import { audit, extractContext } from '@/lib/audit-log';
import {
  sanitizePermissionsInput,
  type SanitizedPermission,
} from '@/lib/permissions';

const VALID_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'EDITOR']);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
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
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: actor } = await requireAuth('SUPER_ADMIN');
  if (error || !actor) return error;

  const ctx = extractContext(request);
  const { id } = await params;
  const body = await request.json();
  const before = await prisma.user.findUnique({
    where: { id },
    select: { role: true, isActive: true },
  });
  // Password artık bu endpoint'ten kabul edilmiyor — Super Admin
  // başkasının şifresini belirleyemez. Yeni şifre için "Davet Linki
  // Yeniden Gönder" akışı kullanılır (/api/users/[id]/resend-invite).
  const { name, email, role, isActive, permissions } = body;

  // Role enum whitelist (body'den gelen serbest string Prisma'da 500'e
  // dönüşmesin diye burada keseriz).
  if (role !== undefined && !VALID_ROLES.has(role)) {
    return NextResponse.json({ error: 'Geçersiz rol' }, { status: 400 });
  }

  // Permissions sanitize — section whitelist + strict boolean coerce.
  // Body'de permissions hiç gelmediyse (undefined) iz bırakmaz; gelirse
  // sertleştirilip ileri geçirilir.
  const permsProvided = permissions !== undefined;
  let safePermissions: SanitizedPermission[] = [];
  if (permsProvided) {
    const result = sanitizePermissionsInput(permissions);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    safePermissions = result.sanitized;
  }

  // Self-lockout koruması: Super Admin kendi rolünü düşüremez ve
  // kendini pasife çekemez (aksi halde sistemi yönetemez hale gelir).
  // Başka Super Admin'ler başkasını değiştirebilir — sadece self-edit
  // bloke.
  const editingSelf = actor.id === id;
  if (editingSelf && role && role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Kendi Super Admin rolünüzü düşüremezsiniz' },
      { status: 400 },
    );
  }
  if (editingSelf && isActive === false) {
    return NextResponse.json(
      { error: 'Kendi hesabınızı pasife çekemezsiniz' },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  // Email opsiyonel: boş string null'a düşer (alanı temizleme niyeti). undefined
  // gelirse hiç dokunma. Format kontrolü değer varsa zorunlu.
  if (email !== undefined) {
    const trimmed = String(email).trim().toLowerCase();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta gir' }, { status: 400 });
    }
    updateData.email = trimmed || null;
  }
  if (role) updateData.role = role;
  if (typeof isActive === 'boolean') updateData.isActive = isActive;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, username: true, email: true, name: true, role: true, isActive: true },
  });

  // Update permissions if provided — sanitize edilmiş `safePermissions`
  // kullanılıyor (section whitelist + strict boolean). `permsProvided`
  // false ise hiç dokunmuyoruz; mevcut permissions korunur.
  if (permsProvided) {
    await prisma.userPermission.deleteMany({ where: { userId: id } });
    if (safePermissions.length > 0) {
      await prisma.userPermission.createMany({
        data: safePermissions.map((p) => ({
          userId: id,
          section: p.section,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          canPublish: p.canPublish,
        })),
      });
    }
  }

  // Audit: rol veya isActive değiştiyse ayrı event'lerle yaz, böylece
  // breach response'ta "şu kullanıcının rolü ne zaman yükseltildi"
  // sorgusu hızlı olur.
  if (before && role && role !== before.role) {
    await audit({
      event: 'USER_ROLE_CHANGED',
      actorId: actor.id,
      targetId: id,
      targetType: 'USER',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      detail: `${before.role} → ${role}`,
    });
  }
  if (before && typeof isActive === 'boolean' && isActive !== before.isActive) {
    await audit({
      event: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      actorId: actor.id,
      targetId: id,
      targetType: 'USER',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
  if (permsProvided) {
    await audit({
      event: 'PERMISSIONS_CHANGED',
      actorId: actor.id,
      targetId: id,
      targetType: 'USER',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      detail: `${safePermissions.length} sections`,
    });
  }

  revalidateTag(CACHE_TAGS.user, 'max');
  return NextResponse.json(user);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const ctx = extractContext(request);
  const { id } = await params;

  // Prevent self-deletion
  if (user!.id === id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  // Article.author onDelete yönlendirmesi yok → Prisma foreign key
  // hatası döner. Kullanıcıya anlamlı bir mesaj verelim: kaç makale var,
  // önce onları başka bir yazara transfer etmesi lazım. Cascade
  // istemiyoruz — kullanıcının yazdığı makaleler yazarsız kalmamalı.
  const articleCount = await prisma.article.count({ where: { authorId: id } });
  if (articleCount > 0) {
    return NextResponse.json(
      {
        error: 'User has articles',
        requiresConfirmation: false,
        impact: { articles: articleCount },
        message: `Bu kullanıcının ${articleCount} makalesi var. Silmeden önce makaleleri başka bir yazara devret ya da makaleleri sil.`,
      },
      { status: 409 },
    );
  }

  await prisma.user.delete({ where: { id } });
  await audit({
    event: 'USER_DELETED',
    actorId: user!.id,
    targetId: id,
    targetType: 'USER',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
  revalidateTag(CACHE_TAGS.user, 'max');
  return NextResponse.json({ success: true });
}
