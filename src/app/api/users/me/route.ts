import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserPermissions } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const perms = await getUserPermissions(userId);

  if (!perms) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 2FA durumu — Security ayarları sayfası bunu göstererek "kapat /
  // backup kodları yenile" butonlarını koşullu render ediyor. Permission
  // tablosundan ayrı bir DB hit; önemli değil, bu endpoint zaten admin
  // panelinde SWR cache'leniyor (Sidebar'da bir kez fetch).
  const twoFa = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabledAt: true },
  });

  return NextResponse.json({
    id: perms.user.id,
    username: perms.user.username,
    name: perms.user.name,
    email: perms.user.email,
    role: perms.user.role,
    isSuperAdmin: perms.isSuperAdmin,
    sections: perms.sections,
    twoFactorEnabled: !!twoFa?.twoFactorEnabledAt,
    twoFactorEnabledAt: twoFa?.twoFactorEnabledAt ?? null,
  });
}
