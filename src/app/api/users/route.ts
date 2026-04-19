import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import bcrypt from 'bcryptjs';

export async function GET() {
  const { error, user } = await requireAuth('ADMIN');
  if (error) return error;

  // Admins can see users, but only super admin sees all
  const where = user!.role === 'SUPER_ADMIN' ? {} : { role: 'EDITOR' as const };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, permissions: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth('SUPER_ADMIN');
  if (error) return error;

  const body = await request.json();
  const { email, password, name, role, permissions } = body;

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
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
    select: { id: true, email: true, name: true, role: true, permissions: true },
  });

  return NextResponse.json(user, { status: 201 });
}
