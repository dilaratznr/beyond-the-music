import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { CACHE_TAGS } from '@/lib/db-cache';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, permissions: true },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: actor } = await requireAuth('SUPER_ADMIN');
  if (error || !actor) return error;

  const { id } = await params;
  const body = await request.json();
  // Password artık bu endpoint'ten kabul edilmiyor — Super Admin
  // başkasının şifresini belirleyemez. Yeni şifre için "Davet Linki
  // Yeniden Gönder" akışı kullanılır (/api/users/[id]/resend-invite).
  const { name, email, role, isActive, permissions } = body;

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
  if (email) updateData.email = email;
  if (role) updateData.role = role;
  if (typeof isActive === 'boolean') updateData.isActive = isActive;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  // Update permissions if provided
  if (permissions && Array.isArray(permissions)) {
    await prisma.userPermission.deleteMany({ where: { userId: id } });
    if (permissions.length > 0) {
      await prisma.userPermission.createMany({
        data: permissions.map((p: { section: string; canCreate: boolean; canEdit: boolean; canDelete: boolean; canPublish: boolean }) => ({
          userId: id,
          section: p.section,
          canCreate: p.canCreate ?? false,
          canEdit: p.canEdit ?? false,
          canDelete: p.canDelete ?? false,
          canPublish: p.canPublish ?? false,
        })),
      });
    }
  }

  revalidateTag(CACHE_TAGS.user, 'max');
  return NextResponse.json(user);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

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
  revalidateTag(CACHE_TAGS.user, 'max');
  return NextResponse.json({ success: true });
}
