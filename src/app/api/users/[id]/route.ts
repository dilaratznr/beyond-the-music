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
  const { error } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  // Password artık bu endpoint'ten kabul edilmiyor — Super Admin
  // başkasının şifresini belirleyemez. Yeni şifre için "Davet Linki
  // Yeniden Gönder" akışı kullanılır (/api/users/[id]/resend-invite).
  const { name, email, role, isActive, permissions } = body;

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

  await prisma.user.delete({ where: { id } });
  revalidateTag(CACHE_TAGS.user, 'max');
  return NextResponse.json({ success: true });
}
